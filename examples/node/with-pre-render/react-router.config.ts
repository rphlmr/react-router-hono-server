import type { Config } from "@react-router/dev/config";

export default {
  serverBuildFile: "assets/server-build.js",
  prerender: ["/"],
} satisfies Config;
