import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { Observable, catchError, firstValueFrom, map, of } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface PolygonAggsResult {
  v: number;  
  vw?: number; 
  o: number;  
  c: number;  
  h: number;  
  l: number;  
  t: number;  
  n?: number; 
}

export interface PolygonAggsResponse {
  ticker?: string;
  queryCount?: number;
  resultsCount?: number;
  adjusted?: boolean;
  results?: PolygonAggsResult[];
  status?: string;
  request_id?: string;
  count?: number;
}

export interface PolygonPrevCloseResult {
    T: string; v: number; vw?: number; 
    o: number; c: number; h: number; 
    l: number; t: number; n?: number; 
}

export interface PolygonPrevCloseResponse { 
    ticker?: string;
    queryCount?: number;
    resultsCount?: number;
    adjusted?: boolean;
    results: PolygonPrevCloseResult[]; 
    status?: string;
    request_id?: string;
    count?: number;
}

export interface PolygonTickerDetails {
    ticker: string;                
    name: string;                  
    market?: string;               
    locale?: string;              
    primary_exchange?: string;    
    type?: string;                 
    active?: boolean;             
    currency_name?: string;       
    currency_symbol?: string;       
    cik?: string;                  
    composite_figi?: string;       
    share_class_figi?: string;     
    homepage_url?: string;        
    last_updated_utc?: string;      
  
 
    phone_number?: string;         
    address?: {                   
      address1?: string;
      address2?: string; 
      city?: string;
      state?: string;     
      country?: string; 
      postal_code?: string;
    };
    description?: string;          
    sic_code?: string;           
    sic_description?: string;      
    ticker_root?: string;         
    ticker_suffix?: string;     
    total_employees?: number;      
    list_date?: string;             
    branding?: {                  
      logo_url?: string;            
      icon_url?: string;            
      accent_color?: string;        
      dark_logo_url?: string;         
      dark_icon_url?: string;      
    };
    share_class_shares_outstanding?: number;
    weighted_shares_outstanding?: number;  
    round_lot?: number;             
    market_cap?: number;            
    list_timestamp?: number;        
    exchange_symbol?: string;       
}

export interface PolygonTickerDetailsResponse {
    request_id?: string;
    results?: PolygonTickerDetails;
    status?: string;
}

export interface CryptoData {
  id: string; symbol: string; name: string; image: string;
  current_price: number; market_cap: number; market_cap_rank: number;
  total_volume: number; price_change_percentage_24h: number;
}

interface AlphaVantageRateData {
  from_Currency_code: string;
  from_Currency_name: string;
  to_currency_code: string;
  to_currency_name: string;
  exchange_rate: string; 
  last_refreshed: string;
  time_zone: string;
  bid_price: string;
  ask_price: string;
}

interface AlphaVantageExchangeRateResponse {
  realtime_currency_exchange_rate?: AlphaVantageRateData;
  error_message?: string; 
  note?: string; 
}

const CACHE_TTL_STOCK_AGGS_MS = 60 * 60 * 1000;
const CACHE_TTL_STOCK_PRICE_MS = 15 * 60 * 1000; 
const CACHE_TTL_STOCK_DETAILS_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private readonly coinGeckoApiUrl = 'https://api.coingecko.com/api/v3';
  private readonly polygonApiUrl = 'https://api.polygon.io'; 
  private readonly alphaVantageApiUrl = 'https://www.alphavantage.co';
  private readonly polygonApiKey: string;
  private readonly alphaVantageApiKey: string;

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    const _polygonApiKey = this.configService.get<string>('POLYGON_API_KEY'); 
    if (!_polygonApiKey) { 
      throw new Error('POLYGON_API_KEY environment variable is not set.');
    } else {
      this.polygonApiKey = _polygonApiKey;
    }

    const _alphaVantageApiKey = this.configService.get<string>('ALPHAVANTAGE_API_KEY');
    if (!_alphaVantageApiKey) {
      throw new Error('ALPHAVANTAGE_API_KEY environment variable is not set.');
    } else {
      this.alphaVantageApiKey = _alphaVantageApiKey;
    }
  }

  async fetchCoinGeckoMarketData(vs_currency: string = 'usd', per_page: number = 50, page: number = 1, order: string = 'market_cap_desc'): Promise<CryptoData[]> {
    const url = `${this.coinGeckoApiUrl}/coins/markets`;
    const params = {
      vs_currency, order, per_page, page,
      sparkline: false,
      price_change_percentage: '24h'
    };

    this.logger.log(`Workspaceing CoinGecko data from ${url} with params: ${JSON.stringify(params)}`);

    const observable = this.httpService.get<CryptoData[]>(url, { params }).pipe(
      map(response => response.data), 
      catchError((error: AxiosError) => {
        this.logger.error(`Error fetching CoinGecko data: ${error.response?.status}`, error.stack);
        throw new Error('Failed to fetch data from CoinGecko API.');
      }),
    );
    return await firstValueFrom(observable);
  }

  async fetchStockPreviousClose(ticker: string): Promise<PolygonPrevCloseResult | null> {
    if (!this.polygonApiKey) throw new Error('Polygon API key is missing.');

    const upperCaseTicker = ticker.toUpperCase(); 
    const cacheKey = `stock_prev_close_${upperCaseTicker}`;

    const cachedData = await this.cacheManager.get<PolygonPrevCloseResult>(cacheKey);
    if (cachedData) {
      this.logger.debug(`Cache HIT for ${cacheKey}`);
      return cachedData;
    }

    this.logger.debug(`Cache MISS for ${cacheKey}. Fetching from Polygon...`);

    const url = `${this.polygonApiUrl}/v2/aggs/ticker/${upperCaseTicker}/prev`;
    const params = {
      adjusted: 'true', 
      apiKey: this.polygonApiKey, 
    };

    this.logger.log(`Workspaceing Polygon Previous Close for ${upperCaseTicker} from ${url}`);
    
    const observable = this.httpService.get<PolygonPrevCloseResponse>(url, { params }).pipe(
      map(response => {
        if (response.data?.results?.length > 0) {
            this.logger.debug(`Polygon data received for ${response.data.ticker || 'UNKNOWN'}. Results count: ${response.data.resultsCount ?? 'N/A'}. Using first result.`);
            return response.data.results[0]; 
        }
        this.logger.warn(`No previous close data found for ticker ${upperCaseTicker}`);
        return null; 
      }),
      catchError((error: AxiosError) => {
        this.logger.error(`Error fetching Polygon data for ${upperCaseTicker}: ${error.response?.status}`, error.stack);
        throw new Error(`Failed to fetch stock data for ${upperCaseTicker} from Polygon.io.`);
      }),
    );
    const data = await firstValueFrom(observable);

    if (data) {
      await this.cacheManager.set(cacheKey, data, CACHE_TTL_STOCK_PRICE_MS); 
      this.logger.debug(`Cache SET for ${cacheKey}`);
    }

    return data;
  }

  async fetchTickerDetails(ticker: string): Promise<PolygonTickerDetails | null> {
    if (!this.polygonApiKey) throw new Error('Polygon API key is missing.');

    const upperCaseTicker = ticker.toUpperCase();
    const cacheKey = `stock_details_${upperCaseTicker}`;

    const cachedData = await this.cacheManager.get<PolygonTickerDetails>(cacheKey);
    if (cachedData) {
      this.logger.debug(`Cache HIT for ${cacheKey}`);
      return cachedData;
    }

    this.logger.debug(`Cache MISS for ${cacheKey}. Fetching from Polygon...`);

    const url = `${this.polygonApiUrl}/v3/reference/tickers/${upperCaseTicker}`;
    const params = { apiKey: this.polygonApiKey };

    this.logger.log(`Workspaceing Polygon Previous Close for ${upperCaseTicker} from ${url}`);

    const observable = this.httpService.get<PolygonTickerDetailsResponse>(url, { params }).pipe(
      map(response => {
        const details = response.data?.results ?? null;
        if(details) {
            this.logger.debug(`Polygon details received for ${upperCaseTicker}.`);
        } else {
            this.logger.warn(`No details data found for ticker ${upperCaseTicker}`);
        }
        return details;
      }), 
      catchError((error: AxiosError) => {
        this.logger.error(`Error fetching Polygon Ticker Details for ${upperCaseTicker}: ${error.response?.status}`, error.stack);
        return of(null); 
      }),
    );
    const data = await firstValueFrom(observable);

    if (data) {
        await this.cacheManager.set(cacheKey, data, CACHE_TTL_STOCK_DETAILS_MS); 
        this.logger.debug(`Cache SET for ${cacheKey}`);
    }

    return data;
  }

  async fetchStockAggregates(
    ticker: string,
    multiplier: number = 1,
    timespan: string = 'day', 
    from: string, 
    to: string    
  ): Promise<PolygonAggsResult[]> { 
    if (!this.polygonApiKey) throw new Error('Polygon API key is missing.');

    const upperCaseTicker = ticker.toUpperCase();
    const cacheKey = `stock_aggs_${upperCaseTicker}_${multiplier}_${timespan}_${from}_${to}`;

    const cachedData = await this.cacheManager.get<PolygonAggsResult[]>(cacheKey);
    if (cachedData) {
      this.logger.debug(`Cache HIT for ${cacheKey}`);
      return cachedData;
    }

    this.logger.debug(`Cache MISS for ${cacheKey}. Fetching aggregates from Polygon...`);

    const url = `${this.polygonApiUrl}/v2/aggs/ticker/${upperCaseTicker}/range/${multiplier}/${timespan}/${from}/${to}`;
    const params = {
      adjusted: 'true',
      sort: 'asc',      
      limit: 5000,     
      apiKey: this.polygonApiKey,
    };

    this.logger.log(`Workspaceing Polygon Aggregates for ${upperCaseTicker}`);
    this.logger.debug(`[MarketService] EXACT URL being requested for Aggs: "${url}"`);

    const observable = this.httpService.get<PolygonAggsResponse>(url, { params }).pipe(
      map(response => response.data?.results ?? []), 
      catchError((error: AxiosError) => {
        this.logger.error(`Error fetching Polygon Aggregates for ${upperCaseTicker}: ${error.response?.status}`, error.stack);
        return of([]); 
      }),
    );

    const data = await firstValueFrom(observable);

    if (data && data.length > 0) {
      await this.cacheManager.set(cacheKey, data, CACHE_TTL_STOCK_AGGS_MS); 
      this.logger.debug(`Cache SET for ${cacheKey}, ${data.length} results.`);
    } else {
        this.logger.warn(`No aggregate data returned or error occurred for ${upperCaseTicker}, not caching.`);
    }

    return data;
  }

  async fetchAlphaVantageExchangeRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number | null; source: 'cache' | 'api' }> { // Возвращаем объект с курсом и источником
    if (!this.alphaVantageApiKey) {
      throw new Error('Alpha Vantage API key is missing.');
    }

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const cacheKey = `forex_av_${from}_${to}`; 

    const cachedRate = await this.cacheManager.get<number>(cacheKey);
    if (cachedRate !== null && cachedRate !== undefined) { 
      this.logger.debug(`Cache HIT for ${cacheKey}: ${cachedRate}`);
      return { rate: cachedRate, source: 'cache' };
    }

    this.logger.debug(`Cache MISS for ${cacheKey}. Fetching from Alpha Vantage...`);

    const url = `${this.alphaVantageApiUrl}/query`;
    const params = {
      function: 'CURRENCY_EXCHANGE_RATE',
      from_currency: from,
      to_currency: to,
      apikey: this.alphaVantageApiKey,
    };

    this.logger.log(`Workspaceing Alpha Vantage Rate for ${from}->${to} from ${url}`);
    this.logger.debug(`[MarketService] EXACT URL being requested for AV Rate: "${url}" with params: ${JSON.stringify(params)}`);

    const observable = this.httpService.get<AlphaVantageExchangeRateResponse>(url, { params }).pipe(
      map(response => {
        const rateData = response.data?.['Realtime Currency Exchange Rate'];
        const rateString = rateData?.['5. Exchange Rate'];

        if (response.data?.['Error Message']) {
           throw new Error(`Alpha Vantage API Error: ${response.data['Error Message']}`);
        }
        if (response.data?.['Note']) {
            this.logger.warn(`Alpha Vantage API Note: ${response.data['Note']}`);
        }

        if (rateString) {
          const rate = parseFloat(rateString);
          if (!isNaN(rate)) {
            return rate; 
          }
        }
        this.logger.warn(`Could not parse exchange rate from Alpha Vantage response for ${from}->${to}`);
        return null; 
      }),
      catchError((error: AxiosError | Error) => {
        this.logger.error(`Error fetching Alpha Vantage Rate for ${from}->${to}: ${error.message}`, error instanceof Error ? error.stack : undefined);
        return of(null); 
      })
    );

    const rate = await firstValueFrom(observable);

    if (rate !== null) {
       await this.cacheManager.set(cacheKey, rate, 3600 * 1000);
       this.logger.debug(`Cache SET for ${cacheKey}: ${rate}`);
    } else {
        await this.cacheManager.set(cacheKey, null, 15 * 60 * 1000);
         this.logger.debug(`Cache SET for ${cacheKey}: null (due to error or no data)`);
    }


    return { rate, source: 'api' };
  }
}