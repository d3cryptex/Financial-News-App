import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subscription, of } from 'rxjs'; 
import { catchError } from 'rxjs/operators'; 
import { NewsArticle } from '../../data/interfaces/news';
import { NewsService } from '../../data/services/news.service';

@Component({
  selector: 'app-news-cards',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './news-cards.component.html',
  styleUrl: './news-cards.component.css'
})

export class NewsCardsComponent implements OnInit, OnDestroy {
  mainNews: NewsArticle | null = null;   
  latestNews: NewsArticle[] = [];      
  isLoading: boolean = true;          
  errorMsg: string | null = null;     
  private newsSub?: Subscription;

  constructor(private newsService: NewsService, private cdRef: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadInitialNews(); 
  }

  ngOnDestroy(): void {
    this.newsSub?.unsubscribe(); 
  }

  loadInitialNews(): void {
    this.isLoading = true;
    this.errorMsg = null;
    this.mainNews = null;
    this.latestNews = [];
    this.cdRef.detectChanges(); 

    this.newsSub = this.newsService.fetchNews(1, 7)
      .pipe(
        catchError(err => {
          this.errorMsg = err.message || 'Failed to load news';
          console.error('Error loading initial news:', err);
          this.isLoading = false; 
          this.cdRef.detectChanges(); 
          return of(null); 
        })
      )
      .subscribe(response => {
        if (response && response.articles && response.articles.length > 0) {
          this.mainNews = response.articles[0]; 
          this.latestNews = response.articles.slice(1, 7); 
          console.log('Main news:', this.mainNews);
          console.log('Latest news:', this.latestNews);
        } else if (response) { 
             console.log('No articles received from backend.');
             this.errorMsg = 'No news articles found.';
        }

        this.isLoading = false;
        this.cdRef.detectChanges(); 
      });
  }

  getSourceName(source: { id: string | null; name: string } | undefined | null): string {
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

   getNewsItem(index: number): NewsArticle | null {
       return this.latestNews[index] ?? null;
   }
}
