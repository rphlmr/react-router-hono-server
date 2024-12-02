import { io } from "socket.io-client";

// Adapt the port based on some env.
// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.NODE_ENV === "production" ? undefined : "http://localhost:5173";

export const socket = io(URL);
