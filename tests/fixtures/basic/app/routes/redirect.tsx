import { redirect } from "react-router";

export function loader() {
  throw redirect("/", {
    headers: {
      "x-test-redirect": "yes",
    },
  });
}

export default function RedirectRoute() {
  return <h1>should-not-render</h1>;
}
