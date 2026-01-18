import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import type { FilterCategoryDto } from './dto/filter-category.dto';
import type { NewCategory, Category } from './entities/category.entity';
import {
  buildPaginatedResponse,
  type PaginatedResponse,
} from '@/utils/response.types';

@Injectable()
export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  /**
   * Crea una nueva categoría
   */
  async create(createDto: CreateCategoryDto): Promise<Category> {
    // Si tiene parentId, verificar que la categoría padre existe y es del mismo tipo
    if (createDto.parentId) {
      await this.validateParentCategory(
        createDto.parentId,
        createDto.type,
        createDto.userId ?? null,
      );
    }

    const categoryData: NewCategory = {
      userId: createDto.userId ?? null,
      name: createDto.name,
      type: createDto.type,
      icon: createDto.icon,
      color: createDto.color,
      parentId: createDto.parentId,
    };

    return await this.repository.create(categoryData);
  }

  /**
   * Lista todas las categorías con filtros
   * Incluye categorías del sistema (userId = null) y del usuario si se especifica
   */
  async findAll(
    filter: FilterCategoryDto,
  ): Promise<PaginatedResponse<Category>> {
    const { data, total } = await this.repository.findAll(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10;

    return buildPaginatedResponse(data, page, limit, total);
  }

  /**
   * Busca una categoría por ID
   */
  async findOne(id: number): Promise<Category> {
    const category = await this.repository.findById(id);

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return category;
  }

  /**
   * Actualiza una categoría
   */
  async update(id: number, updateDto: UpdateCategoryDto): Promise<Category> {
    // Verificar que la categoría existe
    const category = await this.findOne(id);

    // Si es una categoría del sistema (userId = null), no permitir actualizarla
    if (category.userId === null) {
      throw new BadRequestException(
        'No se pueden modificar las categorías del sistema',
      );
    }

    // Si se está actualizando el parentId, validar
    if (updateDto.parentId !== undefined) {
      // No permitir que una categoría sea su propia padre
      if (updateDto.parentId === id) {
        throw new BadRequestException(
          'Una categoría no puede ser su propia categoría padre',
        );
      }

      // Si tiene parentId, validar que existe y es del mismo tipo
      if (updateDto.parentId) {
        await this.validateParentCategory(
          updateDto.parentId,
          updateDto.type ?? category.type,
          category.userId!,
        );
      }
    }

    return await this.repository.update(id, updateDto);
  }

  /**
   * Desactiva una categoría (soft delete)
   */
  async remove(id: number): Promise<{ message: string }> {
    const category = await this.findOne(id);

    // No permitir eliminar categorías del sistema
    if (category.userId === null) {
      throw new BadRequestException(
        'No se pueden eliminar las categorías del sistema',
      );
    }

    // Verificar si ya está inactiva
    if (!category.isActive) {
      throw new BadRequestException('La categoría ya está inactiva');
    }

    // Verificar si tiene transacciones asociadas
    const hasTransactions = await this.repository.hasTransactions(id);
    if (hasTransactions) {
      throw new ConflictException(
        'No se puede eliminar una categoría con transacciones asociadas',
      );
    }

    // Verificar si tiene subcategorías activas
    const hasSubcategories = await this.repository.hasSubcategories(id);
    if (hasSubcategories) {
      throw new ConflictException(
        'No se puede eliminar una categoría con subcategorías activas',
      );
    }

    await this.repository.softDelete(id);

    return { message: 'Categoría desactivada exitosamente' };
  }

  /**
   * Reactiva una categoría
   */
  async reactivate(id: number): Promise<{ message: string }> {
    const category = await this.findOne(id);

    // No permitir reactivar categorías del sistema (no deberían estar inactivas)
    if (category.userId === null) {
      throw new BadRequestException(
        'No se pueden reactivar las categorías del sistema',
      );
    }

    // Verificar si ya está activa
    if (category.isActive) {
      throw new BadRequestException('La categoría ya está activa');
    }

    await this.repository.reactivate(id);

    return { message: 'Categoría reactivada exitosamente' };
  }

  /**
   * Valida que una categoría padre sea válida
   */
  private async validateParentCategory(
    parentId: number,
    childType: 'INCOME' | 'EXPENSE',
    userId: string | null,
  ): Promise<void> {
    const parent = await this.repository.findById(parentId);

    if (!parent) {
      throw new NotFoundException(
        `Categoría padre con ID ${parentId} no encontrada`,
      );
    }

    // Verificar que la categoría padre es del mismo tipo
    if (parent.type !== childType) {
      throw new BadRequestException(
        'La categoría padre debe ser del mismo tipo (INCOME o EXPENSE)',
      );
    }

    // Verificar que la categoría padre pertenece al mismo usuario o es del sistema
    if (userId !== null && parent.userId !== null && parent.userId !== userId) {
      throw new BadRequestException(
        'La categoría padre debe pertenecer al mismo usuario o ser una categoría del sistema',
      );
    }

    // Verificar que la categoría padre está activa
    if (!parent.isActive) {
      throw new BadRequestException(
        'No se puede usar una categoría inactiva como padre',
      );
    }
  }
}
