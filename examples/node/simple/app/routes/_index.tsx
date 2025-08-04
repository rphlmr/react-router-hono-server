import { useState } from "react";
import { useRevalidator } from "react-router";
import { Input } from "~/components/input";
import { getPublic } from "~/utils/.client/public";
import { getCommon } from "~/utils/.common/common";
import { getSecret } from "~/utils/.server/secret";
import { getEnv } from "~/utils/env.server";
import dbLogo from "/images/database.svg";
import type { Route } from "./+types/_index";

export function loader() {
  console.log(getSecret(), getCommon());
  return {
    env: getEnv(),
  };
}

export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  console.log(getPublic(), getCommon());
  return {
    ...(await serverLoader()),
  };
}

clientLoader.hydrate = true;

export default function Index({ loaderData: data }: Route.ComponentProps) {
  const [value, setValue] = useState("");
  console.log("dbLogo", dbLogo);
  console.log("value", value);
  const { revalidate } = useRevalidator();
  return (
    <div className="inset-0 flex flex-col justify-center items-center bg-gray-100 min-h-screen">
      <button type="button" onClick={revalidate} className="flex items-center gap-2">
        <img src={dbLogo} alt="Database" />
        Revalidate
      </button>
      <input />
      <Input value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="mt-8 w-full max-w-4xl overflow-x-auto">
        <table className="bg-gray-100 shadow-md rounded-lg w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="px-6 py-3 font-medium text-gray-600 text-xs text-left uppercase tracking-wider">Key</th>
              <th className="px-6 py-3 font-medium text-gray-600 text-xs text-left uppercase tracking-wider">Value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(data.env).map(([key, value]) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 text-sm whitespace-nowrap">{key}</td>
                <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">{value ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
