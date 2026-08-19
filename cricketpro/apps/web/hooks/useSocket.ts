"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket(matchId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!matchId) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[socket] connected:", socket.id);
      setConnected(true);
      socket.emit("join", { room: `match:${matchId}` });
    });

    socket.on("disconnect", () => {
      console.log("[socket] disconnected");
      setConnected(false);
    });

    socket.on("ball:update", (payload) => {
      console.log("[socket] ball:update", payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [matchId]);

  return { socketRef, connected };
}