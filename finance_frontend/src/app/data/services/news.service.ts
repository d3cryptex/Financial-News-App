import { Injectable } from '@angular/core';
import { HttpClient, HttpParams  } from '@angular/common/http';
import { News } from '../interfaces/news';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { NewsArticle } from '../interfaces/news';

export interface NewsApiResponse {
  articles: NewsArticle[];
  totalResults: number;
}

@Injectable({
  providedIn: 'root'
})

export class NewsService {
  private backendNewsUrl = 'http://localhost:3000/news'

  constructor(private http: HttpClient) { }

  fetchNews(page: number = 1, pageSize: number = 12): Observable<NewsApiResponse> {
    let params = new HttpParams()
    .set('page', page.toString())
    .set('pageSize', pageSize.toString());

    console.log(`Workspaceing news FROM BACKEND: ${this.backendNewsUrl} with params:`, params.toString());

    return this.http.get<NewsApiResponse>(this.backendNewsUrl, { params: params }).pipe(
      tap(data => console.log(`Received ${data.articles?.length ?? 0}/${data.totalResults} news articles FROM BACKEND`)),
      catchError(error => {
        console.error('Error fetching news FROM BACKEND:', error);
        return throwError(() => new Error('Failed to fetch news from backend.'));
      })
    );
  }
}
