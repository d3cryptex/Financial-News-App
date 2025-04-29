import { Controller, Get, Post, Body, Query,UsePipes, ValidationPipe, ParseIntPipe, DefaultValuePipe, Logger } from '@nestjs/common';
import { NewsService } from './news.service';
import { News } from './new.entity';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, IsString, IsUrl, IsOptional, IsObject, IsDateString, Allow } from 'class-validator'

class SourceDto {
  @Allow() 
  id: string | null;

  @IsString()
  name: string;
}

class ArticleDto {
  @IsString()
  newsid: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  content: string;

  @IsUrl()
  url: string;

  @IsUrl()
  @IsOptional()
  urlToImage?: string;

  @IsObject()
  @ValidateNested() 
  @Type(() => SourceDto) 
  source: SourceDto;

  @IsDateString() 
  date: string;
}

export class BulkLoadNewsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleDto) 
  articles: ArticleDto[];
}

@Controller('news')
export class NewsController {
  private readonly logger = new Logger(NewsController.name);
  
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async getNews(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 12;
    return this.newsService.getNews(pageNum, pageSizeNum);
  }

  @Get('db')
  async getNewsFromDb(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(12), ParseIntPipe) pageSize: number,
  ) {
    this.logger.log(`Incoming request: GET /news/db - page: ${page}, pageSize: ${pageSize}`);
    try {
      return await this.newsService.getNewsFromDb(page, pageSize);
    } catch (error) {
      this.logger.error(`Error in GET /news/db endpoint: ${error.message}`, error.stack);
      throw error; 
    }
  }

  @Post('bulk-load')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))
  async loadBulkNews(@Body() bulkData: BulkLoadNewsDto) { 
    this.logger.log(`Incoming request: POST /news/bulk-load - attempting to load ${bulkData.articles.length} articles.`);
    try {
      const result = await this.newsService.bulkInsertNews(bulkData.articles);
      return { message: `Successfully processed/inserted ${result.length} articles.` };
    } catch (error) {
      this.logger.error(`Error in POST /news/bulk-load endpoint: ${error.message}`, error.stack);
      throw error;
    }
  }
}
