import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Graceful Shutdown Demo" },
    { name: "description", content: "Bun adapter graceful shutdown example" },
  ];
}

export default function Index() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-8 text-center">
        <h1 className="text-4xl font-bold">Graceful Shutdown for Bun Demo</h1>
        <p className="text-lg text-gray-600 max-w-md">
          This example demonstrates the graceful shutdown feature of the Bun adapter. Press{" "}
          <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl+C</kbd> in the terminal to test graceful shutdown.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
          <h2 className="font-semibold mb-2">What happens on shutdown:</h2>
          <ol className="text-left space-y-1 text-sm">
            <li>1. Server stops accepting new connections</li>
            <li>2. Existing requests complete</li>
            <li>3. Cleanup callback executes</li>
            <li>4. Process exits cleanly</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
