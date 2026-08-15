import type { Route } from "./+types/post";

export function loader({ params }: Route.LoaderArgs) {
  return { slug: params.slug };
}

export default function Post({ loaderData }: Route.ComponentProps) {
  return <h1>Post: {loaderData.slug}</h1>;
}
