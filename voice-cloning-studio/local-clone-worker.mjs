import * as ort from './clone-runtime/ort.wasm.min.mjs';
import {SentencePieceProcessor} from './clone-runtime/sentencepiece.mjs';

// ONNX graph contracts from OpenMOSS/MOSS-TTS-Nano (Apache-2.0),
// revision 8b7bcc9341b3b4ef3a3a58ba1338a7d85ff133eb.
const ttsBase = 'https://huggingface.co/REALBITS/MOSS-TTS-Nano-100M-ONNX-int8/resolve/23fd19793be20a4f3f6aacd4e3a2130c8e3d2519/';
const codecBase = 'https://huggingface.co/OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano-ONNX/resolve/ceff0d0749bfb3fa2d61149794ec6feef0d1e1ae/';
const modelBytes = 288_397_552;
const sampleRate = 48_000;
const channels = 2;

ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.wasm.wasmPaths = new URL('./clone-runtime/', import.meta.url).href;

const int = (data, dims) => new ort.Tensor('int32', data instanceof Int32Array ? data : Int32Array.from(data), dims);
const float = (data, dims) => new ort.Tensor('float32', data instanceof Float32Array ? data : Float32Array.from(data), dims);
const send = (type, detail = {}, transfer = []) => self.postMessage({type, ...detail}, transfer);
const discard = values => Object.values(values).forEach(tensor => tensor.dispose());

async function loadRuntime() {
  const cache = await globalThis.caches?.open('sawtak-moss-models-v1').catch(() => null);
  let loaded = 0;
  async function read(base, name) {
    const url = base + name;
    const request = new Request(url, {credentials:'omit'});
    const cached = await cache?.match(request).catch(() => undefined);
    const response = cached ?? await fetch(request);
    if (!response.ok) throw new Error(`Model download failed (${response.status}): ${name}`);
    const storing = !cached && cache ? cache.put(request, response.clone()).catch(() => {}) : null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    await storing;
    loaded += bytes.byteLength;
    send('download', {loaded, total:modelBytes});
    return bytes;
  }
  async function json(base, name) {
    return JSON.parse(new TextDecoder().decode(await read(base, name)));
  }
  async function session(base, name, dataName, data) {
    const graph = await read(base, name);
    const weights = data ?? await read(base, dataName);
    return ort.InferenceSession.create(graph, {
      executionProviders:['wasm'], graphOptimizationLevel:'all',
      externalData:[{path:dataName, data:weights}],
    });
  }

  const manifest = await json(ttsBase, 'browser_poc_manifest.json');
  const tts = await json(ttsBase, 'tts_browser_onnx_meta.json');
  const codec = await json(codecBase, 'codec_browser_onnx_meta.json');
  const tokenizer = new SentencePieceProcessor();
  const model = await read(ttsBase, 'tokenizer.model');
  const binary = Array.from({length:Math.ceil(model.length / 8192)}, (_, index) =>
    String.fromCharCode(...model.subarray(index * 8192, (index + 1) * 8192))).join('');
  await tokenizer.loadFromB64StringModel(btoa(binary));

  let globalWeights = await read(ttsBase, 'moss_tts_global_shared_int8.data');
  const prefill = await session(ttsBase, tts.files.prefill, 'moss_tts_global_shared_int8.data', globalWeights);
  const decode = await session(ttsBase, tts.files.decode_step, 'moss_tts_global_shared_int8.data', globalWeights);
  globalWeights = null;
  const frame = await session(ttsBase, tts.files.local_fixed_sampled_frame, 'moss_tts_local_fixed_sampled_frame_int8.data');
  const encode = await session(codecBase, codec.files.encode, codec.external_data_files[codec.files.encode][0]);
  const audio = await session(codecBase, codec.files.decode_full, codec.external_data_files[codec.files.decode_full][0]);
  return {manifest, tts, tokenizer, prefill, decode, frame, encode, audio};
}

async function referenceCodes(runtime, pcm) {
  const samples = pcm.length / channels;
  const result = await runtime.encode.run({
    waveform:float(pcm, [1, channels, samples]),
    input_lengths:int([samples], [1]),
  });
  const length = result.audio_code_lengths.data[0];
  const codes = Int32Array.from(result.audio_codes.data.subarray(0, length * runtime.manifest.tts_config.n_vq));
  discard(result);
  if (!codes.length) throw new Error('The voice encoder returned no reference frames.');
  return codes;
}

function textParts(text, tokenizer) {
  const parts = [];
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity:'word'}) : null;
  for (const sentence of text.split(/(?<=[.!?؟。！？])|\n+/u)) {
    let current = '';
    const words = segmenter ? Array.from(segmenter.segment(sentence), word => word.segment) : (sentence.match(/\s+|\S+/gu) ?? []);
    for (const segment of words) {
      if (current.trim() && tokenizer.encodeIds(current + segment).length > 72) {
        parts.push(current.trim());
        current = '';
      }
      current += segment;
    }
    if (current.trim()) parts.push(current.trim());
  }
  return parts;
}

async function speechFrames(runtime, reference, text) {
  const {tts_config:config, prompt_templates:prompt, generation_defaults:defaults} = runtime.manifest;
  const quantizers = config.n_vq;
  const width = quantizers + 1;
  const prefix = [...prompt.user_prompt_prefix_token_ids, config.audio_start_token_id];
  const suffix = [config.audio_end_token_id, ...prompt.user_prompt_after_reference_token_ids,
    ...runtime.tokenizer.encodeIds(text), ...prompt.assistant_prompt_prefix_token_ids, config.audio_start_token_id];
  const length = prefix.length + reference.length / quantizers + suffix.length;
  const ids = new Int32Array(length * width).fill(config.audio_pad_token_id);
  let row = 0;
  for (const token of prefix) ids[row++ * width] = token;
  for (let offset = 0; offset < reference.length; offset += quantizers) {
    ids[row * width] = config.audio_user_slot_token_id;
    ids.set(reference.subarray(offset, offset + quantizers), row++ * width + 1);
  }
  for (const token of suffix) ids[row++ * width] = token;

  let output = await runtime.prefill.run({
    input_ids:int(ids, [1, length, width]),
    attention_mask:int(new Int32Array(length).fill(1), [1, length]),
  });
  const bookSize = config.audio_codebook_sizes[0];
  const seen = new Int32Array(quantizers * bookSize);
  const frames = [];
  const pastInputs = runtime.tts.onnx.decode_input_names.slice(2);
  try {
    for (let index = 0; index < defaults.max_new_frames; index += 1) {
      const hidden = output.global_hidden;
      const hiddenSize = hidden.dims.at(-1);
      const result = await runtime.frame.run({
        global_hidden:float(hidden.data.subarray(hidden.data.length - hiddenSize), [1, hiddenSize]),
        repetition_seen_mask:int(seen, [1, quantizers, bookSize]),
        assistant_random_u:float([Math.min(Math.random(), 0.99999994)], [1]),
        audio_random_u:float(Float32Array.from({length:quantizers}, () => Math.min(Math.random(), 0.99999994)), [1, quantizers]),
      });
      const keepGoing = Boolean(result.should_continue.data[0]);
      const frame = Int32Array.from(result.frame_token_ids.data);
      discard(result);
      if (!keepGoing) return frames;
      if (frame.length !== quantizers || frame.some(token => token < 0 || token >= bookSize)) {
        throw new Error('The model returned an invalid speech frame.');
      }
      frames.push(frame);
      frame.forEach((token, channel) => {seen[channel * bookSize + token] = 1;});
      const feeds = {
        input_ids:int([config.audio_assistant_slot_token_id, ...frame], [1, 1, width]),
        past_valid_lengths:int([length + index], [1]),
      };
      for (const name of pastInputs) feeds[name] = output[name.replace(/^past_/, 'present_')];
      const next = await runtime.decode.run(feeds);
      discard(output);
      output = next;
    }
  } finally {
    discard(output);
  }
  throw new Error('The model did not finish the current phrase.');
}

async function decodeFrames(runtime, frames) {
  const width = runtime.manifest.tts_config.n_vq;
  const codes = new Int32Array(frames.length * width);
  frames.forEach((frame, index) => codes.set(frame, index * width));
  const result = await runtime.audio.run({
    audio_codes:int(codes, [1, frames.length, width]),
    audio_code_lengths:int([frames.length], [1]),
  });
  const length = Number(result.audio_lengths.data[0]);
  const widthSamples = result.audio.dims.at(-1);
  const audio = Array.from({length:channels}, (_, index) =>
    result.audio.data.slice(index * widthSamples, index * widthSamples + length));
  discard(result);
  if (!length || audio.some(channel => channel.length !== length || channel.some(x => !Number.isFinite(x)))) {
    throw new Error('The model returned invalid audio.');
  }
  return audio;
}

let runtime;
let running = false;
self.onmessage = async ({data}) => {
  if (data.type !== 'generate' || running) return;
  running = true;
  let stage = 'load';
  try {
    runtime ??= await loadRuntime();
    stage = 'reference';
    send('encoding');
    const reference = await referenceCodes(runtime, data.pcm);
    const parts = textParts(data.text, runtime.tokenizer);
    if (!parts.length) throw new Error('No speakable text.');
    stage = 'generation';
    const chunks = [];
    for (let index = 0; index < parts.length; index += 1) {
      send('generating', {index:index + 1, total:parts.length});
      const frames = await speechFrames(runtime, reference, parts[index]);
      if (!frames.length) throw new Error('The model returned no speech for a phrase.');
      chunks.push(await decodeFrames(runtime, frames));
    }
    const pause = Math.round(sampleRate * 0.18);
    const length = chunks.reduce((sum, chunk) => sum + chunk[0].length, pause * (chunks.length - 1));
    const output = Array.from({length:channels}, () => new Float32Array(length));
    let offset = 0;
    for (const chunk of chunks) {
      chunk.forEach((channel, index) => output[index].set(channel, offset));
      offset += chunk[0].length + pause;
    }
    send('result', {output, sampleRate}, output.map(channel => channel.buffer));
  } catch (error) {
    send('error', {stage, detail:error.message});
  } finally {
    running = false;
  }
};
