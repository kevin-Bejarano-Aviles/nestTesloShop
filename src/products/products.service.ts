import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException, ParseUUIDPipe } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import {validate as isUUID} from 'uuid';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>

  ){}

  async create(createProductDto: CreateProductDto) {
    try {
      
      // if(!createProductDto.slug){
      //   createProductDto.slug = createProductDto.title.toLowerCase().replaceAll('','_').replaceAll("'",'');
      // }

      const product = this.productRepository.create(createProductDto);

      await this.productRepository.save(product);

      return product;

    } catch (error) {
      this.handleDbExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {

    const {limit = 10, offset = 0} = paginationDto;


    const products = await this.productRepository.find({
      take: limit,
      skip: offset
    });

    return products;
  }

  async findOne(term: string) {

    let product: Product;

    if(isUUID(term)){
      product = await this.productRepository.findOneBy({id: term});
    } else{
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder
        .where('UPPER(title) =: title or slug =:slug',{
          title: term.toUpperCase(),
          slug: term.toLowerCase()
        }).getOne();
    }
     

    //const product = await this.productRepository.findOneBy({id: id});
    if(!product) 
      throw new NotFoundException(`Product with id ${term} not foud`)
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      const product = await this.productRepository.preload({
        id:id,
        ...updateProductDto
      });
  
      if (!product){
        throw new NotFoundException(`Product with id: ${id} not foud`);
      }
      const result = await this.productRepository.save(product);
      return result;
    
    } catch (error) {
      this.handleDbExceptions(error);      
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
}
