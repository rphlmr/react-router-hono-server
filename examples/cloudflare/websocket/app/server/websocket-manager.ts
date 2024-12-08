import { DurableObject } from "cloudflare:workers";

type MessagePayload = string | ArrayBuffer;

export class WebSocketManager extends DurableObject {
  // Store connected clients
  private sessions: Map<string, WebSocket>;

  constructor(state: DurableObjectState, env: unknown) {
    super(state, env);
    this.sessions = new Map();

    console.log("💧 Rehydrating websocket connections from hibernation");
    this.ctx.getWebSockets().forEach((ws) => {
      // Rehydrate the WebSocket connections from hibernation
      const wsSessionId = ws.deserializeAttachment() as string;
      this.sessions.set(wsSessionId, ws);
    });
  }

  fetch(_request: Request) {
    // A client initiate a WebSocket connection, fetching the Durable Object
    // It is done once per client connection
    // Let's create a WebSocket connection pair
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    // Generate a random session ID for this connection. You should also be able to get your user ID from the request.
    const wsSessionId = crypto.randomUUID();
    // Keep the session ID in the WebSocket connection for hibernation https://developers.cloudflare.com/durable-objects/best-practices/websockets/#serializeattachment
    server.serializeAttachment(wsSessionId);
    // Accept the WebSocket connection (https://developers.cloudflare.com/durable-objects/best-practices/websockets/#websocket-hibernation-api)
    this.ctx.acceptWebSocket(server, [wsSessionId]);
    // Store the WebSocket connection in the map to reuse it later for sending messages to specific clients, for example
    this.sessions.set(wsSessionId, server);

    console.log("👋 New connection", wsSessionId);

    // Return the WebSocket connection to the client
    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Get the session ID from the WebSocket connection
   *
   * https://developers.cloudflare.com/durable-objects/api/state/#gettags
   */
  private getSessionId(ws: WebSocket) {
    return this.ctx.getTags(ws).at(0);
  }

  private onClose(ws: WebSocket) {
    ws.close();
    // Remove the WebSocket connection from the map
    const wsSessionId = this.getSessionId(ws);
    if (wsSessionId) {
      this.sessions.delete(wsSessionId);
    }

    console.log("Connection closed for wsSessionId: ", wsSessionId);
  }

  /**
   * This is part of the Durable Object API.
   *
   * https://developers.cloudflare.com/durable-objects/api/base/#websocketmessage
   *
   * Note: here, ws is the client that sent the message
   */
  webSocketMessage(ws: WebSocket, payload: MessagePayload) {
    // Starting from here, we have an opportunity to create a 'routing' system to choose what to do with the incoming message
    // The message can be a stringified json to parse, with an action property to switch on!

    // For this example, we will just broadcast the message to all connected clients, assuming that the message is a string
    this.broadcastMessage(ws, payload as string);
  }

  /**
   * This is a custom function to broadcast a message to all connected clients
   */
  broadcastMessage(sender: WebSocket, message: string) {
    // Get the sender session ID, to add it to the broadcasted message
    const senderWsSessionId = this.getSessionId(sender);

    // For some reason if the session ID is not available, abort
    if (!senderWsSessionId) {
      return;
    }

    const payload = { message, senderId: senderWsSessionId };

    console.log(`📡 Broadcasting`, payload);
    console.log(`📡 WebSocket sessions id: `, this.sessions.keys());

    for (const [wsSessionId, ws] of this.sessions) {
      if (ws.readyState !== 1) {
        continue;
      }
      // Skip the sender
      // if (wsSessionId === senderWsSessionId) {
      //   continue;
      // }

      // Send the message to the client
      ws.send(JSON.stringify(payload));
    }
  }

  /**
   * Send a message to a specific client
   *
   * This will be used in our React Router action!
   *
   * @param to A wsSessionId
   * @param message A message
   */
  sendMessage(to: string, message: string) {
    const ws = this.sessions.get(to);

    if (ws) {
      ws.send(JSON.stringify({ message }));
    }
  }

  /**
   * This is part of the Durable Object API.
   *
   * https://developers.cloudflare.com/durable-objects/api/base/#websocketclose
   *
   * Note: here, ws is the client that disconnected
   */
  webSocketClose(ws: WebSocket) {
    //💡 You could broadcast a message to all clients before closing the connection, like a "John Doe left the room" message!
    this.onClose(ws);
  }

  /**
   * This is part of the Durable Object API.
   *
   * https://developers.cloudflare.com/durable-objects/api/base/#websocketclose
   *
   * Note: here, ws is the client that errored
   */
  webSocketError(ws: WebSocket, error: unknown) {
    this.onClose(ws);
  }
}
