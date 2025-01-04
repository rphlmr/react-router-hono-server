interface ReactRouterHonoServerEnv {
  readonly REACT_ROUTER_HONO_SERVER_BUILD_DIRECTORY: string;
  readonly REACT_ROUTER_HONO_SERVER_ASSETS_DIR: string;
  readonly REACT_ROUTER_HONO_SERVER_RUNTIME: string;
  readonly REACT_ROUTER_HONO_SERVER_BASENAME: string;
}

interface ImportMetaEnv extends ReactRouterHonoServerEnv {}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
