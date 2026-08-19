import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(","),
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client emits: socket.emit("join", { room: "match:<matchId>" })
  @SubscribeMessage("join")
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { room: string }) {
    client.join(payload.room);
    this.logger.log(`Client ${client.id} joined room ${payload.room}`);
    return { joined: payload.room };
  }

  @SubscribeMessage("leave")
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: { room: string }) {
    client.leave(payload.room);
    return { left: payload.room };
  }

  // Called by ScoringModule in Week 3 — kept here now so the room-broadcast
  // primitive exists before the scoring engine needs it.
  broadcastToRoom(room: string, event: string, data: unknown) {
    this.server.to(room).emit(event, data);
  }
}