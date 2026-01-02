import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersRepository } from './users.repository';
import { PasswordManager } from 'src/utils/password.service';
import { UserFilterDto } from './dto/filter-user.dto';

@Injectable()
export class UsersService {
  constructor(
    protected readonly repository: UsersRepository,
    protected readonly utils: PasswordManager,
  ) {}
  async create(createUserDto: CreateUserDto) {
    const user = await this.repository.findByEmail(createUserDto.email);
    if (user) {
      throw new BadRequestException('User already exists');
    }
    const password = await this.utils.hashPassword(createUserDto.password);
    const newData = {
      name: `${createUserDto.firstName} ${createUserDto.lastName}`,
      password: password,
      email: createUserDto.email,
    };
    return await this.repository.create(newData);
  }

  async findAll(filter: UserFilterDto) {
    const query = {};
    if (filter.name) {
      query['where'] = {
        name: {
          contains: filter.name,
          mode: 'insensitive',
        },
      };
    }
    if (filter.limit) {
      query['take'] = filter.limit;
    }
    if (filter.page && filter.limit) {
      query['skip'] = (filter.page - 1) * filter.limit;
    }
    if (filter.orderBy && filter.order) {
      query['orderBy'] = {
        [filter.orderBy]: filter.order,
      };
    }

    const data = await this.repository.findAll(query);

    return data;
  }

  async findOne(id: string) {
    const user = await this.repository.getById(id);
    if (!user) throw new NotFoundException('User was not founded');

    return user;
  }

  async findByEmail(email: string) {
    return await this.repository.findByEmail(email);
  }

  // update(id: number, updateUserDto: UpdateUserDto) {
  //   return `This action updates a #${id} user`;
  // }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
