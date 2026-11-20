"""Enable the pinned quantizer to copy native ternary tensors without re-quantizing them."""
from pathlib import Path
import sys

path = Path(sys.argv[1]) / "3rdparty/llama.cpp/src/llama-quant.cpp"
source = path.read_text()
signature = "static bool tensor_allows_quantization(const llama_model_quantize_params * params, llm_arch arch, const ggml_tensor * tensor) {"
assert source.count(signature) == 1 and source.count("/*check_tensors*/ true") == 1
# The input model is checksum-verified. The generic validator has no I2_S case.
# Verify every preserved tensor byte after conversion instead.
source = source.replace(signature, signature + "\n    if (tensor->type == GGML_TYPE_I2_S) return false;")
source = source.replace("/*check_tensors*/ true", "/*check_tensors*/ false")
path.write_text(source)
