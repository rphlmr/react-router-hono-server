import type { Config } from "@react-router/dev/config";

export default {
  serverBuildFile: "assets/server-build.js",
  ssr: false,
  prerender: ["/"],
} satisfies Config;
