import { Route } from "./+types/403";

export async function loader() {
  return null;
}

export default function ProjectRoute({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <h1>403</h1>
      <p>Access to this page is restricted.</p>
    </main>
  );
}
