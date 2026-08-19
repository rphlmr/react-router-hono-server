import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("loader", "routes/loader.tsx"),
  route("post/:slug", "routes/post.tsx"),
] satisfies RouteConfig;
