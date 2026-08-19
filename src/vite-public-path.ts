export type VitePublicPath =
  | { kind: "root"; raw: string; pathname: "/" }
  | { kind: "absolute"; raw: string; pathname: string }
  | { kind: "url"; raw: string; pathname: string }
  | { kind: "relative"; raw: string; pathname: "/" };

export function classifyVitePublicPath(raw: string): VitePublicPath {
  if (raw === "" || raw === "./") {
    return { kind: "relative", raw, pathname: "/" };
  }

  if (raw.startsWith("/")) {
    const pathname = normalizeAbsolutePathname(raw);
    return pathname === "/" ? { kind: "root", raw, pathname } : { kind: "absolute", raw, pathname };
  }

  try {
    const url = new URL(raw);
    return { kind: "url", raw, pathname: normalizeAbsolutePathname(url.pathname) };
  } catch {
    return { kind: "relative", raw, pathname: "/" };
  }
}

export function vitePathnamePrefix(publicPath: VitePublicPath): string {
  return publicPath.pathname === "/" ? "" : publicPath.pathname.slice(0, -1);
}

export function viteGeneratedAssetsRoute(publicPath: VitePublicPath, assetsDir: string): string {
  const localPrefix = publicPath.kind === "absolute" ? vitePathnamePrefix(publicPath) : "";
  return `${localPrefix}/${assetsDir.replace(/^\/+|\/+$/g, "")}/*`;
}

export function stripVitePathnamePrefix(pathname: string, publicPath: VitePublicPath): string {
  if (publicPath.kind !== "absolute" || publicPath.pathname === "/") {
    return pathname;
  }

  const prefix = vitePathnamePrefix(publicPath);
  if (pathname === prefix) return "/";
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return pathname;
}

export function composeViteAssetRewriteRequestPath(
  publicPath: VitePublicPath,
  userRewrite?: (path: string) => string,
): (path: string) => string;
export function composeViteAssetRewriteRequestPath<Context>(
  publicPath: VitePublicPath,
  userRewrite?: (path: string, context: Context) => string,
): (path: string, context: Context) => string;
export function composeViteAssetRewriteRequestPath<Context>(
  publicPath: VitePublicPath,
  userRewrite?: (path: string, context?: Context) => string,
) {
  return (requestPath: string, context?: Context) => {
    const logicalPath = stripVitePathnamePrefix(requestPath, publicPath);
    if (!userRewrite) return logicalPath;
    return context === undefined ? userRewrite(logicalPath) : userRewrite(logicalPath, context);
  };
}

function normalizeAbsolutePathname(pathname: string): string {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withLeadingSlash === "/" ? "/" : `${withLeadingSlash.replace(/\/+$/, "")}/`;
}
