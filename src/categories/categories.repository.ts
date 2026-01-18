import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { NewCategory, UpdateCategory } from './entities/category.entity';
import type { FilterCategoryDto } from './dto/filter-category.dto';
import type { Prisma } from '@/generated/prisma/client';

export interface FindAllResult {
  data: Awaited<ReturnType<typeof PrismaService.prototype.category.findMany>>;
  total: number;
}

@Injectable()
export class CategoriesRepository {
  constructor(protected readonly db: PrismaService) {}

  /**
   * Crea una nueva categoría
   */
  async create(data: NewCategory) {
    return await this.db.category.create({ data });
  }

  /**
   * Busca una categoría por ID
   */
  async findById(id: number) {
    return await this.db.category.findUnique({
      where: { id },
      include: {
        parent: true, // Incluir categoría padre si existe
        subcategories: {
          where: { isActive: true },
        }, // Incluir subcategorías activas
      },
    });
  }

  /**
   * Lista todas las categorías con filtros y paginación
   * Incluye tanto categorías del sistema (userId = null) como del usuario
   */
  async findAll(filter: FilterCategoryDto): Promise<FindAllResult> {
    const {
      userId,
      type,
      parentId,
      isActive,
      includeSystem = true,
      page = 1,
      limit = 10,
      orderBy = 'createdAt',
      order = 'desc',
    } = filter;

    const where: Prisma.CategoryWhereInput = {};

    // Lógica para incluir categorías del sistema y/o del usuario
    if (userId) {
      if (includeSystem) {
        // Mostrar categorías del usuario Y categorías del sistema
        where.OR = [{ userId: userId }, { userId: null }];
      } else {
        // Solo categorías del usuario
        where.userId = userId;
      }
    } else {
      // Si no se especifica userId, solo mostrar categorías del sistema
      where.userId = null;
    }

    // Filtros adicionales
    if (type) {
      where.type = type;
    }

    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderByClause: Prisma.CategoryOrderByWithRelationInput = {
      [orderBy]: order,
    };

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.category.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: limit,
        include: {
          parent: true,
          subcategories: {
            where: { isActive: true },
          },
        },
      }),
      this.db.category.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Actualiza una categoría
   */
  async update(id: number, data: UpdateCategory) {
    return await this.db.category.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete: marca una categoría como inactiva
   */
  async softDelete(id: number) {
    return await this.db.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Reactiva una categoría (marca como activa)
   */
  async reactivate(id: number) {
    return await this.db.category.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Verifica si una categoría tiene transacciones asociadas
   */
  async hasTransactions(id: number): Promise<boolean> {
    const count = await this.db.transaction.count({
      where: { categoryId: id },
    });
    return count > 0;
  }

  /**
   * Verifica si una categoría tiene subcategorías
   */
  async hasSubcategories(id: number): Promise<boolean> {
    const count = await this.db.category.count({
      where: { parentId: id },
    });
    return count > 0;
  }
}
