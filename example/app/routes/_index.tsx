import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getEnv } from "~/utils/env.server";

export function loader({ context }: LoaderFunctionArgs) {
  console.log("context", context);
  return {
    env: getEnv(),
  };
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="mt-8 w-full max-w-4xl overflow-x-auto">
        <table className="w-full border-collapse bg-gray-100 shadow-md rounded-lg">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(data.env).map(([key, value]) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{value ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
