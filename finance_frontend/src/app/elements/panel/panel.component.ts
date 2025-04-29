import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subscription, forkJoin, of, timer } from 'rxjs'; 
import { catchError, map, tap, finalize } from 'rxjs/operators'; 

import { CurrencyService, BackendRateResponse } from '../../data/services/currency.service';

interface RateDisplayData {
  code: string; 
  rate: number | null;
  source?: 'cache' | 'api'; 
}

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.css'
})

export class PanelComponent implements OnInit, OnDestroy {

  targetCurrencies: string[] = ['EUR', 'UAH', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'PLN', 'CNY', 'TRY']; 
  baseCurrency: string = 'USD';

  ratesData: RateDisplayData[] = [];

  public isLoading: boolean = true;
  public loadingError: string | null = null;
  private ratesSub?: Subscription;

  constructor(private currencyService: CurrencyService) { } 

  ngOnInit(): void{
    this.loadTopRates();
  }
  
  loadTopRates(): void {
    this.isLoading = true;
    this.loadingError = null;
    this.ratesData = []; 

    const rateRequests$: Observable<RateDisplayData>[] = this.targetCurrencies.map(targetCode =>
      this.currencyService.getAlphaVantageRate(this.baseCurrency, targetCode).pipe(
        map(response => ({ 
          code: targetCode,
          rate: response?.rate ?? null, 
          source: response?.source
        })),
      )
    );

    const allRates$: Observable<RateDisplayData[]> = forkJoin(rateRequests$);

    const minDelay$ = timer(2000);

    this.ratesSub = forkJoin([allRates$, minDelay$]).subscribe({
      next: ([results, _]) => {
        console.log('Received all rates:', results);
        this.ratesData = results; 
        this.isLoading = false;

        const failedCount = results.filter(r => r.rate === null).length;
        if (failedCount > 0) {
            this.loadingError = `${failedCount} rate(s) failed to load (possibly due to API limits).`;
            console.warn(this.loadingError);
        }
      },
      error: (err) => {
        console.error('Error in forkJoin loading rates:', err);
        this.loadingError = 'Failed to load exchange rates.';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.ratesSub?.unsubscribe();
  }
}
