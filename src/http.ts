import type { Context } from "hono";

/**
 * Redirect to a new location in a way that React Router can handle.
 *
 * It follows the Single Fetch Redirect protocol.
 *
 * @deprecated Use `redirect` instead. `import { reactRouterRedirect } from "react-router-hono-server/http"`
 */
export function reactRouterRedirect(location: string) {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          JSON.stringify([
            ["SingleFetchRedirect", 1],
            {
              _2: 3,
              _4: 5,
              _6: 7,
              _8: 9,
              _10: 7,
            },
            "redirect",
            location,
            "status",
            302,
            "revalidate",
            false,
            "reload",
            true,
            "replace",
          ])
        );
        controller.close();
      },
    }),
    {
      status: 202,
      headers: {
        Location: location,
        "X-Remix-Reload-Document": "yes",
        "X-Remix-Response": "yes",
        "Content-Type": "text/x-script",
      },
    }
  );
}

/**
 * Redirect to a new location.
 *
 * It follows the Single Fetch Redirect protocol, if the request path ends with `.data`.
 */
export function redirect(c: Context, location: string) {
  if (c.req.path.includes(".data")) {
    return reactRouterRedirect(location);
  }

  return c.redirect(location);
}

/**
 * Get the current request path
 *
 * If the path ends with `.data` (React Router Single Fetch query), it will be removed.
 */
export function getPath(c: Context) {
  return c.req.path.replace(".data", "");
}
