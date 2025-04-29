import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { News } from './new.entity';
import { HttpModule } from '@nestjs/axios'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([News]),  
    HttpModule,  
  ],
  providers: [NewsService],
  controllers: [NewsController],
})
export class NewsModule {}
