import { Injectable, Logger, InternalServerErrorException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { News } from './new.entity';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

interface InputNewsArticle {
  id?: number; 
  newsid: string;
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage?: string; 
  source: { id: string | null, name: string }; 
  date: string; 
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly apiUrl = `https://newsapi.org/v2/top-headlines`;
  private readonly apiKey: string;

  constructor(private readonly http: HttpService,
    @InjectRepository(News)
    private readonly newsRepository: Repository<News>, private readonly configService: ConfigService, @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    const _newsApiKey = this.configService.get<string>('NEWS_API_KEY'); 
    if (!_newsApiKey) { 
      throw new Error('NEWS_API_KEY environment variable is not set.');
    } else {
      this.apiKey = _newsApiKey;
    }
  }

  async getNews(page: number = 1, pageSize: number = 12): Promise<any> {
    let totalResultsFromApi = 0;

    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          apiKey: this.apiKey,
          country: 'us',  
          category: 'business', 
          pageSize: pageSize, 
          page: page, 
        },
      });
      
      const articles = response.data.articles;
      totalResultsFromApi = response.data.totalResults;

      let savedCount = 0;
      for (const article of articles) {
        if (!article.url) {
          this.logger.warn(`Skipping article without URL: ${article.title}`);
          continue;
        }
        const existingNews = await this.newsRepository.findOneBy({ url: article.url });
        if (!existingNews) {
          const newsToSave = this.newsRepository.create({
            newsid: uuidv4(),
            title: article.title,
            description: article.description,
            content: article.content,
            url: article.url,
            urlToImage: article.urlToImage,
            source: article.source, 
            date: article.publishedAt ? new Date(article.publishedAt) : new Date(),
          });

          try {
            await this.newsRepository.save(newsToSave);
            savedCount++;
          } catch (dbError) {
            this.logger.error(`Failed to save article with URL ${newsToSave.url}: ${dbError.message}`, dbError.stack);
          }
        }
      }
      
      if (savedCount > 0) {
        this.logger.log(`Saved ${savedCount} new articles to the database.`);
      } else {
        this.logger.log(`No new articles from the API response needed saving.`);
      }
      
      const skipItems = (page - 1) * pageSize;
      this.logger.log(`Workspaceing page ${page} (${pageSize} items, skipping ${skipItems}) from database.`);

      const dbArticles = await this.newsRepository.find({
        order: {
          date: 'DESC',
        },
        skip: skipItems, 
        take: pageSize, 
      });

      this.logger.log(`Returning ${dbArticles.length} articles from database for page ${page}.`);

      return { articles: dbArticles, totalResults: totalResultsFromApi };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`Axios error fetching news from API (page: ${page}): ${error.message} - Status: ${error.response?.status}`, error.stack);
        throw new Error(`Failed to fetch news from external source: ${error.message}`);
      } else {
        this.logger.error(`Error in getNews service (page: ${page}): ${error.message}`, error.stack);
        throw error; 
      }
    }
  }

  async getNewsFromDb(page: number = 1, pageSize: number = 12): Promise<{ articles: News[], totalCount: number }> {
    this.logger.log(`Executing getNewsFromDbPaginated: Fetch page ${page} (size ${pageSize}) directly from database.`);
    try {
      const skipItems = (page - 1) * pageSize;

      const [results, total] = await this.newsRepository.findAndCount({
        order: {
          date: 'DESC', 
        },
        skip: skipItems, 
        take: pageSize,  
      });

      this.logger.log(`Found ${results.length} articles for page ${page}. Total articles count in DB matching criteria: ${total}.`);
      return { articles: results, totalCount: total };

    } catch (error) {
      this.logger.error(`Failed to fetch paginated news from database (page: ${page}, size: ${pageSize}): ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not retrieve news from database');
    }
  }

  async bulkInsertNews(articlesData: InputNewsArticle[]): Promise<News[]> {
    this.logger.log(`Attempting to bulk insert ${articlesData.length} news articles.`);

    const newsEntities: News[] = articlesData.map(article => {
      if (!article.url) {
          this.logger.warn(`Skipping article due to missing URL: ${article.title}`);
          return null; 
      }
  
    const newsEntity = this.newsRepository.create({
      newsid: article.newsid,
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      urlToImage: article.urlToImage,
      source: article.source,
      date: new Date(article.date),
      });
      return newsEntity;
    }).filter(entity => entity !== null) as News[];

    if (newsEntities.length === 0) {
        this.logger.log('No valid news articles to insert after filtering.');
        return [];
    }

    try {
      const savedNews = await this.newsRepository.save(newsEntities);
      this.logger.log(`Successfully inserted ${savedNews.length} news articles.`);
      return savedNews;
    } catch (error) {
      this.logger.error(`Failed to bulk insert news: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Could not insert news articles: ${error.message}`);
    }
  } 
}