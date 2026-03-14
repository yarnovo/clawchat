import { createPluginRuntimeStore } from "openclaw/plugin-sdk/compat";
import type { PluginRuntime } from "openclaw/plugin-sdk/compat";

const { setRuntime: setClawChatRuntime, getRuntime: getClawChatRuntime } =
  createPluginRuntimeStore<PluginRuntime>("ClawChat runtime not initialized");
export { getClawChatRuntime, setClawChatRuntime };
