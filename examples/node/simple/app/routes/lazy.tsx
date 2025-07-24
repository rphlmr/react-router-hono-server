import { Suspense, lazy } from "react";

const LazyComponent = lazy(() => import("../components/lazy").then((mod) => ({ default: mod.LazyComponent })));

export default function View() {
  return (
    <div>
      <h1>Route with lazy imported component</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    </div>
  );
}
