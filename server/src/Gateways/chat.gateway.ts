import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from 'src/Services/users.service';
import { PrismaService } from 'src/prisma.service';

@WebSocketGateway({
    namespace: '/chat',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(private usersService: UsersService, private prisma: PrismaService) {}

    async handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    async handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('register')
    async handleRegister(@ConnectedSocket() client: Socket, @MessageBody() data: { username: string }) {
        const user = await this.usersService.findOne(data.username);
        if (!user) {
            client.emit('error', 'User not found');
            return;
        }

        console.log("user: ", user);

        client.data.user = user;
        client.join(user.id.toString());

        if (user.username === "COORDINATOR") {
            const users = await this.usersService.findAll();
            client.emit('allUsers', users);
        } else {
            const coordinator = await this.usersService.findFirstCoordinator();
            client.emit('setCoordinator', coordinator.id);
        }
    }


    @SubscribeMessage('getUserMessages')
    async handleGetUserMessages(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: number }) {
        const loggedUser = client.data.user;

        if (!loggedUser) {
            client.emit('error', 'User not registered');
            return;
        }

        let targetId: number;
        if (loggedUser.username === "COORDINATOR") {
            
            targetId = data.userId;
        } else {
            
            const coordinator = await this.usersService.findFirstCoordinator();
            if (!coordinator) {
                client.emit('error', 'Coordinator not found');
                return;
            }
            targetId = coordinator.id;
        }

        const messages = await this.prisma.message.findMany({
            where: {
                OR: [
                    { userId: loggedUser.id, targetId: targetId },
                    { userId: targetId, targetId: loggedUser.id }
                ]
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        console.log(loggedUser.id, " ", targetId)

        client.emit('userMessages', { userId: targetId, messages });
    }



    @SubscribeMessage('message')
    async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { targetId: number; message: string }) {
        if (!client.data.user) {
            client.emit('error', 'User not registered');
            return;
        }

        const message = await this.prisma.message.create({
            data: {
                userId: client.data.user.id,
                targetId: data.targetId,
                text: data.message,
            }
        });

        this.server.to(data.targetId.toString()).emit('receiveMessage', {
            fromId: client.data.user.id,
            targetId: data.targetId,
            from: client.data.user.username, 
            message: data.message,
            messageId: message.id,
            createdAt: message.createdAt
        });          
    }
}
