import { Component, Input, OnInit, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, ViewChild, ElementRef, ViewEncapsulation, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription, forkJoin, of } from 'rxjs';

import { CurrencyService } from '../../data/services/currency.service';
import { NewsCardsComponent } from '../../elements/news-cards/news-cards.component';
import { HeaderComponent } from "../../elements/header/header.component";
import { PanelComponent } from '../../elements/panel/panel.component';
import { RightStocksComponent } from '../../elements/right-stocks/right-stocks.component';
import { FooterComponent } from '../../elements/footer/footer.component';
import { NewsListComponent } from '../../elements/news-list/news-list.component';
import { MarketSliderComponent } from '../../elements/market-slider/market-slider.component';

import { CryptoData, CryptoSlideCategory } from '../../data/interfaces/crypto';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, NewsCardsComponent, MarketSliderComponent, FooterComponent, HeaderComponent, NewsListComponent, PanelComponent, RightStocksComponent],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})

export class MainComponent implements OnDestroy, OnInit  {
  public slideCategories: CryptoSlideCategory[] = [
    { type: 'gainers', title: 'Top Daily Gainers', description: 'Cryptocurrencies with the greatest gains in 24h' },
    { type: 'losers', title: 'Top Daily Losers', description: 'Cryptocurrencies with the greatest losses in 24h' },
    { type: 'volume', title: 'Most Active (Volume)', description: 'Cryptocurrencies with the highest trading volume' },
    { type: 'market_cap', title: 'Top Market Cap', description: 'Top cryptocurrencies by market capitalization' }
  ];

  private fullCryptoList: CryptoData[] = []; 
  public topGainers: CryptoData[] = [];
  public topLosers: CryptoData[] = [];
  public topVolume: CryptoData[] = [];
  public topMarketCap: CryptoData[] = [];

  public isLoading: boolean = true; 
  public loadingError: string | null = null; 
  private dataSub?: Subscription;

  constructor(private currencyService: CurrencyService, private cdRef: ChangeDetectorRef) { } 

  ngOnInit(): void {
    this.loadCryptoData();
  }

  loadCryptoData(): void {
    this.isLoading = true; 
    this.loadingError = null;
    this.dataSub = this.currencyService.getCryptoData(undefined, 100).subscribe({
      next: (data) => {
        console.log('Data received in component:', data);
        this.fullCryptoList = data;
        this.sortCryptoData();
        this.isLoading = false; 
      },
      error: (err) => {
        console.error('Error caught in component:', err);
        this.loadingError = err.message || 'Failed to load cryptocurrency data.';
        this.isLoading = false; 
      }
    });
  }

  sortCryptoData(): void {
    const topN = 5; 

    const sortedByGain = [...this.fullCryptoList].sort((a, b) => (b.price_change_percentage_24h ?? -Infinity) - (a.price_change_percentage_24h ?? -Infinity));
    const sortedByLoss = [...this.fullCryptoList].sort((a, b) => (a.price_change_percentage_24h ?? Infinity) - (b.price_change_percentage_24h ?? Infinity));
    const sortedByVolume = [...this.fullCryptoList].sort((a, b) => (b.total_volume ?? 0) - (a.total_volume ?? 0));

    this.topGainers = sortedByGain.slice(0, topN);
    this.topLosers = sortedByLoss.slice(0, topN);
    this.topVolume = sortedByVolume.slice(0, topN);
    this.topMarketCap = this.fullCryptoList.slice(0, topN);

    console.log('Processed Gainers:', this.topGainers);
    console.log('Processed Losers:', this.topLosers);
    console.log('Processed Volume:', this.topVolume);
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
  }
}
