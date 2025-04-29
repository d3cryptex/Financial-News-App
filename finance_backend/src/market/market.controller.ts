import { Controller, Get, Logger, Query, Param, HttpException, HttpStatus } from '@nestjs/common';
import { MarketService, CryptoData, PolygonPrevCloseResult, PolygonTickerDetails, PolygonAggsResult } from './market.service';
import * as dayjs from 'dayjs';

@Controller('market')
export class MarketController {
  private readonly logger = new Logger(MarketController.name);

  constructor(private readonly marketDataService: MarketService) {}

  @Get('crypto')
  async getCryptoMarketData(
    @Query('vs_currency') vs_currency?: string, 
    @Query('per_page') per_page?: number,
    @Query('page') page?: number,
    @Query('order') order?: string
  ): Promise<CryptoData[]> {
    try {
      this.logger.log(`Request received for /crypto: ${JSON.stringify(arguments)}`);
      const perPageNum = per_page ? Number(per_page) : 50;
      const pageNum = page ? Number(page) : 1;

      return await this.marketDataService.fetchCoinGeckoMarketData(
        vs_currency || 'usd', 
        perPageNum,
        pageNum,
        order || 'market_cap_desc'
      );
    } catch (error) {
      this.logger.error(`Failed to get crypto market data: ${error.message}`, error.stack);
      throw new HttpException('Failed to retrieve cryptocurrency market data', HttpStatus.SERVICE_UNAVAILABLE); 
    }
  }

  @Get('stocks/:ticker')
  async getStockPreviousClose(@Param('ticker') ticker: string): Promise<PolygonPrevCloseResult | null> {
    try {
      this.logger.log(`Request received for /stocks/${ticker}`);
      if (!ticker) {
        throw new HttpException('Ticker symbol is required', HttpStatus.BAD_REQUEST);
      }
      const result = await this.marketDataService.fetchStockPreviousClose(ticker);
      if (!result) {
         throw new HttpException(`Data not found for ticker ${ticker}`, HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (error) {
       this.logger.error(`Failed to get stock data for ${ticker}: ${error.message}`, error.stack);
       if (error instanceof HttpException) throw error; 
       throw new HttpException('Failed to retrieve stock market data', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stocks/:ticker/details') 
  async getTickerDetails(
    @Param('ticker') ticker: string
  ): Promise<PolygonTickerDetails | null> {
    try {
      this.logger.log(`Request received for /stocks/${ticker}/details`);
      if (!ticker) {
        throw new HttpException('Ticker symbol is required', HttpStatus.BAD_REQUEST);
      }
      const details = await this.marketDataService.fetchTickerDetails(ticker);
       if (!details) {
           this.logger.warn(`Details not found for ticker ${ticker}, returning null.`);
       }
      return details; 
    } catch (error) {
      this.logger.error(`Failed to get ticker details for ${ticker}: ${error.message}`, error.stack);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to retrieve ticker details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('stocks/:ticker/aggs') 
  async getStockAggregates(
    @Param('ticker') ticker: string,
    @Query('multiplier') multiplier?: string, 
    @Query('timespan') timespan?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limitDays') limitDays?: string 
  ): Promise<PolygonAggsResult[]> {
    try {
      this.logger.log(`Request received for /stocks/${ticker}/aggs`);
      if (!ticker) {
        throw new HttpException('Ticker symbol is required', HttpStatus.BAD_REQUEST);
      }

      const daysToFetch = limitDays ? parseInt(limitDays, 10) : 7;
      const dateTo = to || dayjs().format('YYYY-MM-DD'); 
      const dateFrom = from || dayjs(dateTo).subtract(daysToFetch, 'day').format('YYYY-MM-DD');

      const mult = multiplier ? parseInt(multiplier, 10) : 1;
      const ts = timespan || 'day'; 

      this.logger.debug(`Aggs params: Ticker=${ticker}, M=${mult}, TS=${ts}, From=${dateFrom}, To=${dateTo}`);

      return await this.marketDataService.fetchStockAggregates(ticker, mult, ts, dateFrom, dateTo);
    } catch (error) {
      this.logger.error(`Failed to get stock aggregates for ${ticker}: ${error.message}`, error.stack);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to retrieve stock aggregates', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('currency/exchange/:from/:to') 
  async getAlphaVantageExchangeRate(
    @Param('from') from: string,
    @Param('to') to: string
  ): Promise<{ rate: number | null; source: 'cache' | 'api' }> { 
    try {
      this.logger.log(`Request received for currency/exchange/${from}/${to}`);
      if (!from || !to) {
        throw new HttpException('Both "from" and "to" currency codes are required', HttpStatus.BAD_REQUEST);
      }
      return await this.marketDataService.fetchAlphaVantageExchangeRate(from, to);
    } catch (error) {
      this.logger.error(`Failed to get Alpha Vantage rate for ${from}->${to}: ${error.message}`, error.stack);
       if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to retrieve exchange rate', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
