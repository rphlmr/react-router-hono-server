import React from "react";
import { Await } from "react-router";
import type { Route } from "./+types/defer";

async function getProjectLocation() {
  return new Promise((resolve) => setTimeout(() => resolve("user/project"), 2000)) as Promise<string>;
}

export async function loader() {
  return {
    project: getProjectLocation(),
  };
}

export default function ProjectRoute({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <h1>Let's locate your project</h1>
      <React.Suspense fallback={<p>Loading project location...</p>}>
        <Await resolve={loaderData.project} errorElement={<p>Error loading project location!</p>}>
          {(location) => <p>Your project is at {location}.</p>}
        </Await>
      </React.Suspense>
    </main>
  );
}
