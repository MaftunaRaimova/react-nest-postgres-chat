// users.controller.ts
import { Controller, Get, Param, Post, Body, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/Services/users.service';

@Controller('/api/users')
export class UsersController {
    constructor(private usersService: UsersService) {}

    @Get(':username')
    async getUserByUsername(@Param('username') username: string) {
        const user = await this.usersService.findOne(username);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    @Post('/create')
    async createUser(@Body() createUserDto: { username: string; password: string; role: string }) {
        return this.usersService.createUser(createUserDto);
    }

    @Get('coordinator/first')
    async getFirstCoordinator() {
        const coordinator = await this.usersService.findFirstCoordinator();
        if (!coordinator) {
            throw new NotFoundException('Coordinator not found');
        }
        return coordinator;
    }
}