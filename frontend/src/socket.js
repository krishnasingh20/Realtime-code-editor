import { io } from "socket.io-client";

// Single socket instance
export const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});
