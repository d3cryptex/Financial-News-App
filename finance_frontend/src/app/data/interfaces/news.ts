export interface News {
    id: string;
    title: string;
    vendor: string;
    date: Date;
    description: string[];
    image: string;
}

export interface NewsArticle {
    source: { id: string | null; name: string };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string; 
    content: string | null;
}
  