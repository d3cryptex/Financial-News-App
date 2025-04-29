import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; 
import { Observable, catchError, tap, throwError, of } from 'rxjs';
import { StockPrevCloseResult, StockTickerDetails, PolygonAggsResult } from '../interfaces/stock';
import { CryptoData } from '../interfaces/crypto';

export interface BackendRateResponse {
  rate: number | null;
  source: 'cache' | 'api';
}

@Injectable({
  providedIn: 'root'
})

export class CurrencyService {
  private backendApiUrl = 'http://localhost:3000/market'; 

  constructor(private http: HttpClient) { }

  getCryptoData(vs_currency: string = 'usd', per_page: number = 50, page: number = 1,order: string = 'market_cap_desc'): Observable<CryptoData[]> {
    let params = new HttpParams()
      .set('vs_currency', vs_currency)
      .set('order', order)
      .set('per_page', per_page.toString())
      .set('page', page.toString());

    const url = `${this.backendApiUrl}/crypto`;

    console.log(`Workspaceing crypto data FROM BACKEND: ${url} with params:`, params.toString());

    return this.http.get<CryptoData[]>(url, { params: params }).pipe(
      tap(data => console.log('Received crypto data FROM BACKEND:', data)),
      catchError(error => {
        console.error('Error fetching crypto data FROM BACKEND:', error);
        return throwError(() => new Error('Failed to fetch crypto data from backend.'));
      })
    );
  }

  getStockData(ticker: string): Observable<StockPrevCloseResult | null> {
    if (!ticker) {
      console.error('Ticker symbol cannot be empty.');
      return throwError(() => new Error('Ticker symbol cannot be empty.'));
    }

    const url = `${this.backendApiUrl}/stocks/${ticker.toUpperCase()}`;

    console.log(`Workspaceing stock data FOR ${ticker} FROM BACKEND: ${url}`);

    return this.http.get<StockPrevCloseResult | null>(url).pipe(
      tap(data => console.log(`Received stock data for ${ticker} FROM BACKEND:`, data)),
      catchError(error => {
        console.error(`Error fetching stock data for ${ticker} FROM BACKEND:`, error);
        return throwError(() => new Error(`Failed to fetch stock data for ${ticker} from backend.`));
      })
    );
  }

  getTickerDetails(ticker: string): Observable<StockTickerDetails | null> {
    if (!ticker) {
      console.error('Ticker symbol cannot be empty for getTickerDetails.');
      return throwError(() => new Error('Ticker symbol cannot be empty.'));
    }
    const url = `${this.backendApiUrl}/stocks/${ticker.toUpperCase()}/details`;
  
    console.log(`Workspaceing ticker details FOR ${ticker} FROM BACKEND: ${url}`);
  
    return this.http.get<StockTickerDetails | null>(url).pipe(
      tap(data => console.log(`Received ticker details for ${ticker} FROM BACKEND:`, data)),
      catchError(error => {
        console.error(`Error fetching ticker details for ${ticker} FROM BACKEND:`, error);
        return throwError(() => new Error(`Failed to fetch ticker details for ${ticker} from backend.`));
      })
    );
  }

  getStockAggregates(
    ticker: string,
    days: number = 7, 
    timespan: string = 'day'
  ): Observable<PolygonAggsResult[]> {
    if (!ticker) { return of([]); } 

    const url = `${this.backendApiUrl}/stocks/${ticker.toUpperCase()}/aggs`;
    let params = new HttpParams()
        .set('limitDays', days.toString()) 
        .set('timespan', timespan);      

    console.log(`Workspaceing stock aggregates FOR ${ticker} (last ${days} ${timespan}s) FROM BACKEND: ${url}`);

    return this.http.get<PolygonAggsResult[]>(url, { params }).pipe(
      tap(data => console.log(`Received ${data?.length ?? 0} aggregates for ${ticker} FROM BACKEND:`)),
      catchError(error => {
        console.error(`Error fetching stock aggregates for ${ticker} FROM BACKEND:`, error);
        return of([]); 
      })
    );
  }

  getAlphaVantageRate(from: string, to: string): Observable<BackendRateResponse | null> {
    if (!from || !to) {
      return throwError(() => new Error('"from" and "to" currency codes are required.'));
    }
    const url = `${this.backendApiUrl}/currency/exchange/${from.toUpperCase()}/${to.toUpperCase()}`;
    console.log(`Workspaceing AV rate for ${from}->${to} FROM BACKEND: ${url}`);

    return this.http.get<BackendRateResponse | null>(url).pipe(
      tap(data => console.log(`Received AV rate for ${from}->${to} FROM BACKEND:`, data)),
      catchError(error => {
        console.error(`Error fetching AV rate for ${from}->${to} FROM BACKEND:`, error);
        return of(null); 
      })
    );
  }
}
