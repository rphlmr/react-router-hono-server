import { getSecret } from "~/utils/.server/secret";

// Sentry example
if (process.env.NODE_ENV === "production") {
  console.log("Sentry is enabled");
  console.log("Doing some Sentry stuff before the server starts");
  console.log("Using some secret:", getSecret());
}
