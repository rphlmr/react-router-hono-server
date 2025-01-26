import { createHonoServer } from "react-router-hono-server/aws-lambda";

console.log("loading server");

export const handler = await createHonoServer();
