export interface CryptoData {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    total_volume: number;
    price_change_percentage_24h: number; 
}

export interface CryptoSlideCategory {
    type: 'gainers' | 'losers' | 'volume' | 'market_cap'; 
    title: string;
    description: string;
}