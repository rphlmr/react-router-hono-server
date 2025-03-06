import { getPublic } from "~/utils/.client/public";
import { getCommon } from "~/utils/.common/common";
import { getSecret } from "~/utils/.server/secret";
import { getEnv } from "~/utils/env.server";
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

export default function Index({ loaderData }: Route.ComponentProps) {
  console.log("loaderData", loaderData);
  console.log("import.meta.env.VITE_APP_TITLE", import.meta.env.VITE_APP_TITLE);
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1>{import.meta.env.VITE_APP_TITLE || "No env"}</h1>
    </div>
  );
}
