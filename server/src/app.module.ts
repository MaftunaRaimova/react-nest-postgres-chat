import { Module } from "@nestjs/common";
import { AppService } from "./old/app.service";
import { PrismaService } from "./prisma.service";
import { UsersController } from "src/Gateways/users.controller";
import { UsersService } from "src/Services/users.service";
import { ChatGateway } from "./Gateways/chat.gateway";
import { AppGateway } from "./old/app.gateway";

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [PrismaService, AppService, UsersService, ChatGateway, AppGateway]
})
export class AppModule {}