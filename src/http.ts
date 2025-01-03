/**
 * Redirect to a new location in a way that React Router can handle.
 *
 * It follows the Single Fetch Redirect protocol.
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
