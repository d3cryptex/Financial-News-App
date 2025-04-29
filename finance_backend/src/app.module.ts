import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        charset: 'utf8mb4',
        entities: [User, News],
        synchronize: true,
      }),
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
