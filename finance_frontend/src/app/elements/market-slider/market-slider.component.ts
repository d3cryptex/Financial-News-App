import { Component, Input, OnInit, OnChanges, SimpleChanges, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { SwiperContainer } from 'swiper/element';
import { register } from 'swiper/element/bundle';

import { CryptoData, CryptoSlideCategory } from '../../data/interfaces/crypto';

@Component({
  selector: 'app-market-slider',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe, UpperCasePipe],
  templateUrl: './market-slider.component.html',
  styleUrl: './market-slider.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class MarketSliderComponent implements OnChanges, AfterViewInit {
  @ViewChild('swiperContainer') swiperContainer?: ElementRef<SwiperContainer>;

  @Input() sliderTitle: string = 'Market Data';
  @Input() slideCategories: CryptoSlideCategory[] = [];
  @Input() topGainers: CryptoData[] = [];
  @Input() topLosers: CryptoData[] = [];
  @Input() topVolume: CryptoData[] = [];
  @Input() topMarketCap: CryptoData[] = [];
  @Input() isLoading: boolean = true;
  @Input() loadingError: string | null = null;

  public swiperBreakpoints = {
    '0': {
      slidesPerView: 1,
      spaceBetween: 10
    },
    '640': {
      slidesPerView: 2,
      spaceBetween: 15
    },
    '1024': {
      slidesPerView: 2,
      spaceBetween: 20
    },
    '1200': {
      slidesPerView: 3,
      spaceBetween: 20
    }
  };

  private swiperInitialized = false;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isLoading && !this.loadingError) {
      const needsInitAttempt = !this.swiperInitialized ||
      ['slideCategories', 'topGainers', 'topLosers', 'topVolume', 'topMarketCap']
        .some(prop => changes[prop] && !changes[prop].firstChange);

      if (needsInitAttempt) {
        setTimeout(() => this.initializeSwiper(), 0);
      }
    }
  }

  ngAfterViewInit(): void {
    if (!this.isLoading && !this.loadingError && this.swiperContainer?.nativeElement) {
      setTimeout(() => this.initializeSwiper(), 0);
    }
  }

  initializeSwiper(): void {
    if (this.swiperContainer?.nativeElement && !this.swiperInitialized) {
      try {
        Object.assign(this.swiperContainer.nativeElement, {
          breakpoints: this.swiperBreakpoints,
          navigation: { nextEl: '.custom-next-btn', prevEl: '.custom-prev-btn' },
          pagination: false,
        });
        this.swiperContainer.nativeElement.initialize();
        this.swiperInitialized = true;
      } catch (error) {
        console.error('Swiper initialization FAILED:', error);
      }
    } else if (this.swiperInitialized) {
      // Optionally update swiper if needed:
      // this.swiperContainer?.nativeElement.swiper?.update();
    }
  }

  getChangeClass(change: number | undefined | null): string {
    if (change == null) return '';
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return '';
  }
}