import type { ChannelPlugin, OpenClawPluginApi } from "openclaw/plugin-sdk/compat";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk/compat";
import { clawchatPlugin } from "./src/channel.js";
import { setClawChatRuntime } from "./src/runtime.js";

const plugin = {
  id: "clawchat",
  name: "ClawChat",
  description: "ClawChat IM channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setClawChatRuntime(api.runtime);
    api.registerChannel({ plugin: clawchatPlugin as ChannelPlugin });
  },
};

export default plugin;
