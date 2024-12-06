import type { Route } from "./+types/_index";

export default function Index({ loaderData: data }: Route.ComponentProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <a
        href="/queue"
        className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 ease-in-out"
      >
        Go to the Queue Demo
      </a>
    </div>
  );
}
