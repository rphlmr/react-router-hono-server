import { Suspense } from "react";
import { Await } from "react-router";

export async function loader() {
  return {
    immediate: "immediate-value",
    deferred: new Promise<string>((resolve) => {
      setTimeout(() => resolve("deferred-value"), 400);
    }),
  };
}

export default function DeferredRoute({
  loaderData,
}: {
  loaderData: { immediate: string; deferred: Promise<string> };
}) {
  return (
    <div>
      <p>{loaderData.immediate}</p>
      <Suspense fallback={<p>loading-deferred</p>}>
        <Await resolve={loaderData.deferred}>{(value) => <p>{value}</p>}</Await>
      </Suspense>
    </div>
  );
}
