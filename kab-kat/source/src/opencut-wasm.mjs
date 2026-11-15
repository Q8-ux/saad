import * as bindings from "opencut-wasm/opencut_wasm_bg.js";
import binary from "opencut-wasm/opencut_wasm_bg.wasm?url";

const response = await fetch(binary);
if (!response.ok) throw new Error("Could not fetch the OpenCut engine");
const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {
  "./opencut_wasm_bg.js": bindings,
});
bindings.__wbg_set_wasm(instance.exports);
instance.exports.__wbindgen_start();

export * from "opencut-wasm/opencut_wasm_bg.js";
