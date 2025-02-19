import { Injectable } from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {
  
  constructor(
    private readonly productsService: ProductsService,

  ){}

  async runSeed(){
    await this.insertNewProducts();
  }

  private async insertNewProducts(){
    await this.productsService.deleteAllProducts();

    const seedProducts = initialData.products;

    const insertPormises = [];

    seedProducts.forEach(product => {
      insertPormises.push(this.productsService.create(product))
    })
    await Promise.all(insertPormises);

    return true;
  }
}
