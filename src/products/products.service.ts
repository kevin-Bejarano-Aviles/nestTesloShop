import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {validate as isUUID} from 'uuid';
import { ProductImage } from './entities/product-image.entity';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource,
    
  ){}

  async create(createProductDto: CreateProductDto) {
    try {
      
      const { images = [], ...productDetails} = createProductDto;

      const product = this.productRepository.create({
        ...productDetails,
        images: images.map( image => this.productImageRepository.create({ulr: image}) )
      });

      await this.productRepository.save(product);

      return {...product,images};

    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {

    const {limit = 10, offset = 0} = paginationDto;


    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      relations:{
        images: true,
      }
    });

    return products.map( product => ({
      ...product,
      images: product.images.map(img => img.ulr)
    }));
  }

  async findOne(term: string) {

    let product: Product;

    if(isUUID(term)){
      product = await this.productRepository.findOneBy({
        id: term
      });
    } else{
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder
        .where('UPPER(title) =: title or slug =:slug',{
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect('prod.images','prodImages')
        .getOne();
    }
     

    //const product = await this.productRepository.findOneBy({id: id});
    if(!product) 
      throw new NotFoundException(`Product with id ${term} not foud`)
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const {images, ...toUpdate} = updateProductDto;

    const product = await this.productRepository.preload({
      id:id,
      ...toUpdate,
    });

    if (!product){
      throw new NotFoundException(`Product with id: ${id} not foud`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {

      if(images){
        await queryRunner.manager.delete(ProductImage, {product: { id:id }} ) 
        product.images = images.map(image => this.productImageRepository.create({ulr: image}))
      }

      await queryRunner.manager.save(product)

      await queryRunner.commitTransaction();

      await queryRunner.release();

      //await this.productRepository.save(product);
      return this.findOnePlain(id);
    
    } catch (error) {

      await queryRunner.rollbackTransaction();
      await queryRunner.release();

      this.handleDbExceptions(error);      
    }
  }

  async findOnePlain (term: string) {
    const {images = [], ...rest} = await this.findOne(term);
    return {
      ...rest,
      images: images.map( image => image.ulr)
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    await this.productRepository.remove(product);
    
  }

  private handleDbExceptions(error:any){
    if(error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }

  async deleteAllProducts(){
    const query = this.productRepository.createQueryBuilder('product');

    try {
      return await query
        .delete()
        .where({})
        .execute()
    } catch (error) {
      this.handleDbExceptions(error);
    }
  }
}
