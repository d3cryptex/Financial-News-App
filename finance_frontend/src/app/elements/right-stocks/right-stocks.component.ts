import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SwiperContainer } from 'swiper/element';
import { Observable, Subscription, forkJoin, of, timer } from 'rxjs';
import { map, catchError, tap, finalize } from 'rxjs/operators';

import { PolygonAggsResult, StockPrevCloseResult, StockTickerDetails } from '../../data/interfaces/stock';
import { CurrencyService } from '../../data/services/currency.service';

import { NgApexchartsModule } from 'ng-apexcharts';
import {
  ApexAxisChartSeries, ApexChart, ApexStroke, ApexTooltip,
  ApexXAxis, ApexYAxis, ApexGrid, ApexDataLabels, ApexFill, ApexMarkers
} from "ng-apexcharts";

export interface StockData {
  ticker: string;
  details: StockTickerDetails | null;
  prevClose: StockPrevCloseResult | null;
  aggregates?: PolygonAggsResult[] | null;
  ocChangePercent?: number | null;
  chartOptions?: Partial<ChartOptions>; 
}

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  stroke?: ApexStroke;
  tooltip?: ApexTooltip;
  xaxis?: ApexXAxis;
  colors?: string[];
  yaxis?: ApexYAxis | ApexYAxis[];
  grid?: ApexGrid;
  dataLabels?: ApexDataLabels;
  fill?: ApexFill;
  markers?: ApexMarkers;
};

@Component({
  selector: 'app-right-stocks',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './right-stocks.component.html',
  styleUrl: './right-stocks.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class RightStocksComponent implements OnInit, OnDestroy{  
  private stockCardData$!: Observable<StockData>;
  private allStockData: StockData[] = []; 
  public stockTopGainers: StockData[] = [];   
  public stockTopLosers: StockData[] = [];    
  public stockMostActive: StockData[] = [];  

  private stockTickers: string[] = [
    'AAPL', 'MSFT', 'NVDA', 'TSLA', 'CYTK', 'META', 'NFLX', 'GOOGL',
    'AMZN', 'NCNO', 'F', 'LCID', 'SOFI', 'PLTR', 'NIO', 'AMD', 'INTC',
    'BABA', 'BRK.B', 'V', 'JPM', 'PYPL', 'DIS', 'KO', 'PEP', 'XOM', 'BA',
    'WMT', 'T', 'CSCO', 'CRM', 'IBM', 'UBER', 'LYFT', 'PFE', 'MRNA', 'ABNB',
    'SQ', 'RBLX', 'SHOP', 'SNAP', 'SPCE', 'TWLO', 'ZS', 'DOCU', 'CRWD'
  ]; 

  public isLoading: boolean = true;
  public loadingError: string | null = null; 
  private dataSub?: Subscription;

  constructor(private currencyService: CurrencyService, private cdRef: ChangeDetectorRef) { } 

  ngOnInit(): void {
    this.loadStockData();
  }

  loadStockData(): void {
    this.isLoading = true; 
    this.isLoading = true;
    this.loadingError = null;
    
    const uniqueTickers = [...new Set(this.stockTickers)];

    const dataFetch$ = forkJoin(
      uniqueTickers.map(ticker =>
        forkJoin({ 
          ticker: of(ticker),
          details: this.currencyService.getTickerDetails(ticker).pipe(catchError(() => of(null))),
          prevClose: this.currencyService.getStockData(ticker).pipe(catchError(() => of(null))),
          aggregates: this.currencyService.getStockAggregates(ticker).pipe(catchError(() => of(null))) 
        }).pipe(
          map(data => ({ 
            ...data,
            ocChangePercent: this.calculateOCChangePercent(data.prevClose),
            ocChangeAbsolute: this.getOCAbsoluteChange(data.prevClose)
          } as StockData))
        )
      )
    );

    const minDelay$ = timer(2000);

    this.dataSub = forkJoin([dataFetch$, minDelay$]).subscribe({
      next: ([results, _]) => {
        console.log('All stock data received and mapped:', results);
        this.allStockData = results.filter(r => r.prevClose !== null) as StockData[];

        this.allStockData.forEach(stock => {
          stock.chartOptions = this.generateChartOptions(stock);
          console.log(`Chart options ${stock.ticker}:`, stock.chartOptions);
        });

        console.log('allStockData array AFTER adding chart options:', this.allStockData);

        this.sortStockData(); 
        this.isLoading = false;

        const failedCount = results.filter(r => r.prevClose === null || r.details === null).length;
        if (failedCount > 0) {  }

        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Error loading stock data:', err);
        this.loadingError = 'Failed to load stock data.';
        this.isLoading = false;
      }
    });
  }

  sortStockData(): void {
    const topN = 5; 

    const sortedByChange = [...this.allStockData].sort((a, b) => {
        const changeA = a.ocChangePercent ?? 0;
        const changeB = b.ocChangePercent ?? 0;
        return changeB - changeA; 
    });

    const sortedByVolume = [...this.allStockData].sort((a, b) => {
        const volumeA = a.prevClose?.v ?? 0; 
        const volumeB = b.prevClose?.v ?? 0;
        return volumeB - volumeA; 
    });

    this.stockTopGainers = sortedByChange.slice(0, topN);
    this.stockTopLosers = [...sortedByChange].sort((a, b) => (a.ocChangePercent ?? 0) - (b.ocChangePercent ?? 0)).slice(0, topN);
    this.stockMostActive = sortedByVolume.slice(0, topN);

    console.log('Top Gainers:', this.stockTopGainers);
    console.log('Top Losers:', this.stockTopLosers);
    console.log('Most Active:', this.stockMostActive);
  }

  calculateOCChangePercent(data: StockPrevCloseResult | null): number | null {
    if (data && data.o && data.c && data.o !== 0) {
      return ((data.c - data.o) / data.o);
    }
    return null;
  }

  getOCChange(data: StockPrevCloseResult | null): number { 
    if (data && data.o && data.c && data.o !== 0) {
      return ((data.c - data.o) / data.o);
    }
    return 0; 
  }

  getOCAbsoluteChange(data: StockPrevCloseResult | null): number | null {
    if (data && data.o && data.c) {
      return data.c - data.o;
    }
    return null;
  }

  getChangeClass(change: number | undefined | null): string {
    if (change == null) return '';
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return '';
  }

  generateChartOptions(stockData: StockData): Partial<ChartOptions> {
    const change = stockData.ocChangePercent ?? 0;
    const color = change >= 0 ? '#4caf50' : '#f44336'; 
    const seriesData = stockData.aggregates?.map(agg => agg.c) ?? []; 

    console.log(`Generating chart options for ${stockData.ticker}:`, {
      color: color,
      seriesData: seriesData, 
      aggregatesReceived: stockData.aggregates?.length 
   });

    const options: Partial<ChartOptions> = {
      chart: {
        type: 'area',
        height: 35, 
        width: 50,  
        sparkline: {
          enabled: true 
        },
        animations: { enabled: false }
      },
      series: [{ data: seriesData }],
      colors: [color],
      stroke: {
        curve: 'smooth', 
        width: 1.5 
      },
      fill: {
        type: 'gradient', 
        gradient: {
          shadeIntensity: 0.8, 
          opacityFrom: 0.5,  
          opacityTo: 0.1,    
          stops: [0, 100]    
        }
      },
      tooltip: { enabled: false }, 
      xaxis: { labels: { show: false }, axisBorder: {show: false}, axisTicks: { show: false } },
      yaxis: { show: false },
      grid: { show: false },
      markers: { size: 0 }
    };

    return options;
  }

  hasValidChartData(stock: StockData): boolean {
    return (stock.chartOptions?.series?.[0]?.data?.length ?? 0) > 1;
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
  }
}
