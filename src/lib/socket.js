import { io } from "socket.io-client";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

let socket = null;

/**
 * One socket for the app. Joining a per-property room means a change at Divic
 * Urban never lands on a screen at Divic Exclusive.
 */
export function connectSocket(location) {
  if (!socket) socket = io(BASE, { transports: ["websocket"], autoConnect: true });
  socket.emit("join", location);
  return socket;
}

export function onEvent(name, handler) {
  if (!socket) return () => {};
  socket.on(name, handler);
  return () => socket.off(name, handler);
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
