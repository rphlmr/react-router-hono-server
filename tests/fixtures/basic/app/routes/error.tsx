export function loader() {
  throw new Response("explicit-error", {
    status: 418,
  });
}

export default function ErrorRoute() {
  return <h1>should-not-render</h1>;
}
