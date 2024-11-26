import type { ServerOptions as ServerOptions$1, createServer } from "node:http";
import type {
  SecureServerOptions,
  ServerOptions as ServerOptions$3,
  createSecureServer,
  createServer as createServer$2,
} from "node:http2";
import type { ServerOptions as ServerOptions$2, createServer as createServer$1 } from "node:https";

type createHttpOptions = {
  serverOptions?: ServerOptions$1;
  createServer?: typeof createServer;
};
type createHttpsOptions = {
  serverOptions?: ServerOptions$2;
  createServer?: typeof createServer$1;
};
type createHttp2Options = {
  serverOptions?: ServerOptions$3;
  createServer?: typeof createServer$2;
};
type createSecureHttp2Options = {
  serverOptions?: SecureServerOptions;
  createServer?: typeof createSecureServer;
};
export type CreateNodeServerOptions =
  | createHttpOptions
  | createHttpsOptions
  | createHttp2Options
  | createSecureHttp2Options;
