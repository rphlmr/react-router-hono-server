import { message as serverMessage } from "../message.server";

export async function loader() {
  return {
    message: "hello-from-loader",
    serverMessage,
  };
}

export default function LoaderRoute({
  loaderData,
}: {
  loaderData: { message: string; serverMessage: string };
}) {
  return (
    <div>
      <h1>{loaderData.message}</h1>
      <p>{loaderData.serverMessage}</p>
    </div>
  );
}
