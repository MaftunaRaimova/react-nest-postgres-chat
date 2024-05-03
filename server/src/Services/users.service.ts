// users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class UsersService {
    
    constructor(private prisma: PrismaService) {}

    async findOne(username: string) {

        console.log("username in service: ", username);

        return this.prisma.users.findUnique({
            where: { username },
        });
    }

    async createUser(data: { username: string; password: string; role: string }) {
        return this.prisma.users.create({
            data,
        });
    }

    async findFirstCoordinator() {
        return this.prisma.users.findFirst({
            where: { username: 'COORDINATOR' },
        });
    }

    async findAll() {

        return this.prisma.users.findMany({
            where: {
                username: {
                    not: 'COORDINATOR'
                }
            },
        });        
    }
}
