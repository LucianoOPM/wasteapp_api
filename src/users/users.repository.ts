import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  UserModel,
  UserCreateInput,
  UserFindManyArgs,
} from '../generated/prisma/models/User';

@Injectable()
export class UsersRepository {
  constructor(protected readonly db: PrismaService) {}

  async findByEmail(email: string): Promise<UserModel | null> {
    return await this.db.user.findUnique({
      where: {
        email,
      },
    });
  }

  async create(newData: UserCreateInput) {
    return await this.db.user.create({ data: newData });
  }

  async findAll(query: UserFindManyArgs) {
    return await this.db.user.findMany({
      where: query.where || {},
      orderBy: query.orderBy || { id: 'asc' },
      take: query.take || 100,
      skip: query.skip || 0,
    });
  }

  async getById(id: string) {
    return await this.db.user.findUnique({
      where: {
        id: id,
      },
    });
  }
}
