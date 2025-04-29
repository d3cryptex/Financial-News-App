export interface StockPrevCloseResult {
    T: string; v: number; vw?: number; o: number; c: number;
    h: number; l: number; t: number; n?: number;
}
  
export interface StockTickerDetails {
    ticker: string;                 
    name: string;                  
    market?: string;               
    locale?: string;                
    primary_exchange?: string;     
    type?: string;                 
    active?: boolean;              
    currency_name?: string;         
    currency_symbol?: string;      
    base_currency_symbol?: string; 
    base_currency_name?: string;    
    cik?: string;                   
    composite_figi?: string;       
    share_class_figi?: string;     
    market_cap?: number;          
    phone_number?: string;         
    address?: {                   
      address1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
    };
    description?: string;           
    sic_code?: string;              
    sic_description?: string;     
    ticker_root?: string;          
    homepage_url?: string;        
    total_employees?: number;      
    list_date?: string;            
    branding?: {                  
      logo_url?: string;           
      icon_url?: string;            
    };
    share_class_shares_outstanding?: number; 
    weighted_shares_outstanding?: number;  
    round_lot?: number;            
    last_updated_utc?: string;      
}

export interface PolygonAggsResult {
  v: number; o: number; c: number; h: number; l: number; t: number; n?: number; vw?: number;
}

export interface StockSlideCategory {
  type: 'gainers' | 'losers' | 'volume' | 'market_cap'; 
  title: string;
  description: string;
}
