import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { ProductsService } from 'src/products/products.service';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [ProductsService]
})
export class SeedModule {}
