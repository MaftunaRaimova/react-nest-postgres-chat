import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Prisma } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { MessageUpdatePayload } from "types";
import { CLIENT_URI } from "../constants";
import { AppService } from "./app.service";

interface UserRoomMap {
  [userId: string]: string; // Маппинг: userId => roomId
}

@WebSocketGateway({
  cors: {
    origin: CLIENT_URI
  },
  serveClient: false,
  namespace: "chat"
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private users: Record<string, string> = {}; // Define the users object here

  constructor(private readonly appService: AppService) {}

  @WebSocketServer() server: Server;

  private userRoomMap: UserRoomMap = {};

  @SubscribeMessage("messages:get")
  async handleMessagesGet(): Promise<void> {
    const messages = await this.appService.getMessages();
    this.server.emit("messages", messages);
  }

  @SubscribeMessage("messages:clear")
  async handleMessagesClear(): Promise<void> {
    await this.appService.clearMessages();
  }

  @SubscribeMessage("message:post")
  async handleMessagePost(
    @MessageBody()
    payload: Prisma.MessageCreateInput
  ): Promise<void> {
    const createdMessage = await this.appService.createMessage(payload);
    this.server.emit("message:post", createdMessage);
    this.handleMessagesGet();
  }

  @SubscribeMessage("message:put")
  async handleMessagePut(
    @MessageBody()
    payload: MessageUpdatePayload
  ): Promise<void> {
    const updatedMessage = await this.appService.updateMessage(payload);
    this.server.emit("message:put", updatedMessage);
    this.handleMessagesGet();
  }

  @SubscribeMessage("message:delete")
  async handleMessageDelete(
    @MessageBody()
    payload: Prisma.MessageWhereUniqueInput
  ) {
    const removedMessage = await this.appService.removeMessage(payload);
    this.server.emit("message:delete", removedMessage);
    this.handleMessagesGet();
  }

  afterInit(server: Server) {
    console.log(server);
  }

  handleConnection(client: Socket) {
    const userName = client.handshake.query.userName as string;
    const userId = client.handshake.query.userId as string;
    const socketId = client.id;
    this.users[socketId] = userName; // Use this.users instead of users

    const roomId = this.createRoom(userId);
    client.join(roomId);
  }

  handleDisconnect(client: Socket) {
    const socketId = client.id;
    const userName = this.users[socketId]; // Use this.users instead of users
    const userId = client.handshake.query.userId as string;
    delete this.users[socketId]; // Use this.users instead of users

    const roomId = this.userRoomMap[userId];
    if (roomId) {
      client.leave(roomId);
      delete this.userRoomMap[userId];
    }

    client.broadcast.emit("log", `${userName} disconnected`);
  }

  private createRoom(userId: string): string {
    const roomId = `room_${userId}`;
    this.userRoomMap[userId] = roomId;
    return roomId;
  }

  private sendMessageToRoom(roomId: string, event: string, data: any) {
    this.server.to(roomId).emit(event, data)
  }
}
