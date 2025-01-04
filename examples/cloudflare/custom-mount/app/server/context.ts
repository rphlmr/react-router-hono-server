import { createGetLoadContext } from "react-router-hono-server/cloudflare";

/**
 * Declare our loaders and actions context type
 */
declare module "react-router" {
  interface AppLoadContext {
    /**
     * The app version from the build assets
     */
    readonly appVersion: string;
  }
}

export const getLoadContext = createGetLoadContext((c, { mode, build }) => {
  const isProductionMode = mode === "production";
  return {
    appVersion: isProductionMode ? build.assets.version : "dev",
  };
});
