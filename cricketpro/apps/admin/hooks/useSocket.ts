"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(matchId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!matchId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    function joinRoom() {
      socket.emit("join", { room: `match:${matchId}` });
    }

    socket.on("connect", () => {
      setConnected(true);
      joinRoom();
    });

    socket.on("reconnect", () => {
      setConnected(true);
      joinRoom();
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      console.warn("[socket] disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      setConnected(false);
      console.error("[socket] connect_error:", err.message);
    });

    return () => {
      socket.off("connect");
      socket.off("reconnect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.disconnect();
    };
  }, [matchId]);

  return { socketRef, connected };
}