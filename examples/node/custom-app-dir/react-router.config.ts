import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src/app",
  future: {
		unstable_optimizeDeps: true,
		unstable_splitRouteModules: true,
	},
} satisfies Config;
