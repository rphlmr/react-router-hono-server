import type { Config } from "@react-router/dev/config";

declare module "react-router" {
  interface Future {
    v8_middleware: true; // 👈 Enable middleware types
  }
}

export default {
  future: {
    unstable_splitRouteModules: true,
    v8_middleware: true,
  },
} satisfies Config;
