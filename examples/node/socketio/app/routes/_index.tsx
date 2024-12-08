import { useCallback, useEffect, useState } from "react";
import { socket } from "~/socket.client";

let isHydrating = true;

export default function Index() {
  const [isHydrated, setIsHydrated] = useState(!isHydrating);

  useEffect(() => {
    isHydrating = false;
    setIsHydrated(true);
  }, []);

  if (isHydrated) {
    return <Client />;
  } else {
    return <div>Loading...</div>;
  }
}

function Client() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [lastMessage, setLastMessage] = useState<string>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onMessage(lastMessage: string) {
      console.log(`Message from server: ${lastMessage}`);
      setMessageHistory((prev) => prev.concat(lastMessage));
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message", onMessage);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message", onMessage);
    };
  }, []);

  const handleClickSendMessage = useCallback(() => {
    if (message.trim()) {
      socket.emit("message", message);
      setMessageHistory((prev) => prev.concat(message));
      setLastMessage(message);
      setMessage("");
    }
  }, [message]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-sm rounded-lg p-6">
          {/* Connection Status */}
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-sm text-gray-600">
                Status: <span className="font-medium">{isConnected ? "Connected" : "Disconnected"}</span>
              </span>
            </div>
          </div>

          {/* Send Message Input and Button */}
          <div className="mb-8 space-y-4">
            <div className="flex space-x-4">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                disabled={!isConnected}
              />
              <button
                onClick={handleClickSendMessage}
                disabled={!isConnected || !message.trim()}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                  ${
                    isConnected && message.trim()
                      ? "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
              >
                Send
              </button>
            </div>
            {!isConnected && <p className="text-sm text-red-500">Connect to the WebSocket to send messages</p>}
          </div>

          {/* Last Message */}
          {lastMessage && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-900 mb-1">Last message:</h3>
              <p className="text-sm text-gray-600">{lastMessage}</p>
            </div>
          )}

          {/* Message History */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Message History</h3>
            <div className="border rounded-md divide-y">
              {messageHistory.length === 0 ? (
                <p className="text-sm text-gray-500 p-4">No messages yet</p>
              ) : (
                messageHistory.map((message, idx) => (
                  <div key={idx} className="p-4">
                    <p className="text-sm text-gray-600">{message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
