import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}
    
    async createUser(name: string, email: string, password: string): Promise<User> {
        const emailExists = await this.checkEmailExists(email);
        if (emailExists) {
            throw new ConflictException('Email already in use');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = this.userRepository.create({ 
            id: uuidv4(), 
            name, 
            email, 
            password: 
            hashedPassword, 
            isGoogleAccount: false, 
            googleId: '/assets/img/avatar.png' 
        });

        return await this.userRepository.save(user);
    }

    async createGoogleUser(name: string, email: string, googleId: string, picture?: string ): Promise<User> {
        let user = await this.userRepository.findOne({ where: { email } });
    
        const avatarUrlToSet = picture ?? '/assets/img/avatar.png';

        if (!user) {
            user = this.userRepository.create({ 
                id: uuidv4(), 
                name: name, 
                email: email,
                password: '', 
                isGoogleAccount: true, 
                googleId: googleId,
                avatar_url: avatarUrlToSet
            });
        } else {
            user.googleId = googleId;
            await this.userRepository.save(user);
        }
    
        try {
            const savedUser = await this.userRepository.save(user);
            console.log('User saved/updated via Google successfully:', savedUser);
            return savedUser;
        } catch (error) {
            console.error('Error saving user during Google user creation/update:', error);
            throw error; 
        }
    }
    
    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.userRepository.findOne({ where: { email } });
    
        if (!user) {
            throw new NotFoundException('User not found');
        }
    
        if (user.isGoogleAccount) {
            throw new UnauthorizedException('This account created through Google. Use sigin through Google.');
        }

        if (!user.password) { 
            throw new UnauthorizedException('Invalid credentials');
        }
    
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid password');
        }
    
        return user;
    }    

    async findAll(): Promise<User[]> {
        return await this.userRepository.find();
    }

    async findOneById(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException(`User with id ${id} not found.`);
        }
        return user;
    }
    
    async findOneByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async updateUser(id: string, userData: any): Promise<User> {
        const updateResult = await this.userRepository.update(id, userData);
        if (updateResult.affected === 0) {
          throw new NotFoundException(`User with id ${id} not found.`);
        }
        return await this.findOneById(id);
    }
    
    async partialUpdateUser(id: string, userData: any): Promise<User> {
        const updateResult = await this.userRepository.update(id, userData);
        if (updateResult.affected === 0) {
          throw new NotFoundException(`User with id ${id} not found.`);
        }
        return await this.findOneById(id);
    }
    
    async removeUser(id: string): Promise<void> {
        const deleteResult = await this.userRepository.delete(id);
        if (deleteResult.affected === 0) {
          throw new NotFoundException(`User with id ${id} not found.`);
        }
    }

    async checkUsernameExists(username: string): Promise<boolean> {
        const user = await this.userRepository.findOne({ where: { name: username } });
        return user ? true : false;  
    }
    
    async checkEmailExists(email: string): Promise<boolean> {
        const user = await this.userRepository.findOne({ where: { email } });
        return !!user;
    }

    async checkEmailLinkedToGoogle(email: string): Promise<boolean> {
        const user = await this.userRepository.findOne({ 
            where: { email, isGoogleAccount: true }  
        });
        return !!user;
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        let user: User;
        try {
             user = await this.userRepository.findOneOrFail({ where: { id: userId } });
        } catch (error) {
             console.error(`Change password failed: User with id ${userId} not found.`);
             throw new NotFoundException(`User with id ${userId} not found.`);
        }

        if (user.isGoogleAccount) {
            throw new BadRequestException('Cannot change password for Google-linked accounts.');
        }

        if (!user.password) {
             throw new BadRequestException('Password is not set for this account.');
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Incorrect current password.');
        }

        if (currentPassword === newPassword) {
            throw new BadRequestException('New password cannot be the same as the current password.');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedNewPassword;

        await this.userRepository.save(user);

        console.log(`Password successfully changed for user ${userId}`);
    }
}
