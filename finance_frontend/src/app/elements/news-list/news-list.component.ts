import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule, DatePipe } from '@angular/common'; 
import { Observable, Subscription, of } from 'rxjs'; 
import { catchError, tap } from 'rxjs/operators'; 
import { NewsService, NewsApiResponse } from '../../data/services/news.service';
import { NewsArticle } from '../../data/interfaces/news';

@Component({
  selector: 'app-news-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './news-list.component.html',
  styleUrl: './news-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class NewsListComponent implements OnInit, OnDestroy {
  @ViewChild('loadMoreTrigger') loadMoreTrigger?: ElementRef;

  allArticles: NewsArticle[] = [];
  currentPage: number = 1;
  pageSize: number = 5;
  totalResults: number = 0;
  isLoading: boolean = true;
  isLoadingMore: boolean = false;
  errorMsg: string | null = null;
  isEndOfResults: boolean = false;

  private newsSub?: Subscription;
  private observer?: IntersectionObserver;
  private observerSetupDone: boolean = false;

  constructor(private newsService: NewsService, private cdRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadNews(true);
  }

  ngOnDestroy(): void {
    this.newsSub?.unsubscribe();
    this.observer?.disconnect(); 
  }

  loadNews(isFirstPage: boolean = false): void {
    if (!isFirstPage && (this.isLoadingMore || this.isEndOfResults)) {
      return;
    }

    if (isFirstPage) {
      this.isLoading = true;
      this.allArticles = []; 
      this.currentPage = 1;
      this.isEndOfResults = false;
      this.observerSetupDone = false;
      this.observer?.disconnect();
    } else {
      this.isLoadingMore = true; 
    }
    this.errorMsg = null;

    this.newsSub = this.newsService.fetchNews(this.currentPage, this.pageSize)
    .pipe(
      catchError(err => {
        this.errorMsg = err.message || 'Failed to load news articles.';
        console.error(err);
        this.isEndOfResults = true; 

        this.isLoading = false;
        this.isLoadingMore = false;
        this.cdRef.detectChanges(); 
        return of({ articles: [], totalResults: this.totalResults }); 
      })
    ).subscribe(response => {
        const wasLoadingFirstPage = this.isLoading;

        this.isLoading = false;
        this.isLoadingMore = false;

        if (response.articles && response.articles.length > 0) {
            this.allArticles = [...this.allArticles, ...response.articles];
            this.totalResults = response.totalResults;
            this.currentPage++; 
            if (this.allArticles.length >= this.totalResults) {
                this.isEndOfResults = true;
                this.observer?.disconnect(); 
                console.log('End of news results reached.');
            }
        } else {
            if (!isFirstPage) { 
              this.isEndOfResults = true;
              this.observer?.disconnect();
            } else if (response.totalResults === 0) {
              this.isEndOfResults = true;
              this.observer?.disconnect();
            }
        }
        this.cdRef.detectChanges(); 

        if (wasLoadingFirstPage && !this.isEndOfResults && !this.observerSetupDone) {
          setTimeout(() => this.setupIntersectionObserver(), 0);
          this.observerSetupDone = true; 
        }
    });
  }

  setupIntersectionObserver(): void {
    if (!this.loadMoreTrigger?.nativeElement) {
      console.error('Load more trigger element not found when trying to set up observer!');
      return;
    }

    console.log('NewsListComponent: Setting up observer for element:', this.loadMoreTrigger.nativeElement);

    const options = {
      root: null, 
      rootMargin: '0px',
      threshold: 0.1 
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        console.log('Observer Callback:', {
          isIntersecting: entry.isIntersecting,
          isLoading: this.isLoading,
          isLoadingMore: this.isLoadingMore,
          isEndOfResults: this.isEndOfResults
        });
        if (entry.isIntersecting && !this.isLoading && !this.isLoadingMore && !this.isEndOfResults) {
          console.log('Load more trigger intersected! Calling loadNews...');
          setTimeout(() => this.loadNews(), 50);
        }
      });
    }, options);

    this.observer.observe(this.loadMoreTrigger.nativeElement);
  }

  getSourceName(source: { id: string | null; name: string }): string {
    return source?.name || 'Unknown Source';
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    const placeholderSrc = 'assets/img/placeholder.jpg'; 

    if (imgElement.src !== placeholderSrc) {
        console.warn(`Image failed to load: ${imgElement.src}. Replacing with placeholder.`);
        imgElement.src = placeholderSrc; 
    } else {
         console.error('Placeholder image failed to load.');
         imgElement.style.display = 'none';
         imgElement.parentElement?.classList.add('placeholder-active'); 
    }
  }

  trackByUrl(index: number, article: NewsArticle): string {
    return article.url;
  }
}
