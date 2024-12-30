interface ReactRouterRedirectOptions {
  /**
   * Reload the page after redirecting
   *
   * It will trigger a document reload and re-fetch all the assets
   *
   * @default false
   */
  reload: boolean;
}

export function reactRouterRedirect(location: string, { reload }: { reload: boolean } = { reload: false }) {
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
            reload,
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
        "X-Remix-Reload-Document": String(reload),
        "X-Remix-Response": "yes",
        "Content-Type": "text/x-script",
      },
    }
  );
}
