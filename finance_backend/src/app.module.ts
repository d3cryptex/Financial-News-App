import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { NewsModule } from './news/news.module';
import { News } from './news/new.entity';
import { User } from './users/user.entity';
import { MarketModule } from './market/market.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root', 
      password: '7007DanilkO7007', 
      database: 'script_cash_users', 
      charset: 'utf8mb4',
      entities: [User, News], 
      synchronize: true, 
    }),
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    UsersModule,
    NewsModule,
    MarketModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
