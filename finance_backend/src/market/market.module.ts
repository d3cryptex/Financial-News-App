import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; 
import { CacheModule } from '@nestjs/cache-manager';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';

@Module({
  imports: [HttpModule,
    CacheModule.register({ 
      ttl: 5 * 60 * 1000, 
      max: 100, 
      isGlobal: true, 
    }),
  ], 
  providers: [MarketService],
  controllers: [MarketController],
})
export class MarketModule {}