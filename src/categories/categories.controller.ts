import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import {
  CreateCategoryDto,
  CreateCategorySchema,
} from './dto/create-category.dto';
import {
  UpdateCategoryDto,
  UpdateCategorySchema,
} from './dto/update-category.dto';
import {
  FilterCategoryDto,
  FilterCategorySchema,
} from './dto/filter-category.dto';
import { ZodValidationPipe } from '@/pipes/ZodValidationPipe';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * POST /categories
   * Crea una nueva categoría
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(new ZodValidationPipe(CreateCategorySchema))
    createCategoryDto: CreateCategoryDto,
  ) {
    return await this.categoriesService.create(createCategoryDto);
  }

  /**
   * GET /categories
   * Lista todas las categorías con filtros
   * Query params: userId, type, parentId, isActive, includeSystem, page, limit, orderBy, order
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query(new ZodValidationPipe(FilterCategorySchema))
    filterDto: FilterCategoryDto,
  ) {
    return await this.categoriesService.findAll(filterDto);
  }

  /**
   * GET /categories/:id
   * Obtiene una categoría por ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.categoriesService.findOne(id);
  }

  /**
   * PATCH /categories/:id
   * Actualiza una categoría
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateCategorySchema))
    updateCategoryDto: UpdateCategoryDto,
  ) {
    return await this.categoriesService.update(id, updateCategoryDto);
  }

  /**
   * DELETE /categories/:id
   * Desactiva una categoría (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.categoriesService.remove(id);
  }

  /**
   * PATCH /categories/:id/reactivate
   * Reactiva una categoría previamente desactivada
   */
  @Patch(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivate(@Param('id', ParseIntPipe) id: number) {
    return await this.categoriesService.reactivate(id);
  }
}
