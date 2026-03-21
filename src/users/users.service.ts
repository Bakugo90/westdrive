import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import {
  buildPaginatedResponse,
  resolvePagination,
  type PaginatedResponse,
} from '../shared/pagination/pagination.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserStatus } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createUser(payload: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    companyProfile?: {
      companyName: string;
      siret: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
    } | null;
  }): Promise<User> {
    const user = this.userRepository.create({
      ...payload,
      email: payload.email.trim().toLowerCase(),
      status: UserStatus.ACTIF,
      companyProfile: payload.companyProfile ?? null,
    });
    return this.userRepository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: { userRoles: true, companyProfile: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: {
        companyProfile: true,
        userRoles: {
          role: {
            rolePermissions: {
              permission: true,
            },
          },
        },
      },
    });
  }

  async listUsers(page = 1, limit = 20): Promise<PaginatedResponse<User>> {
    const pagination = resolvePagination(page, limit);
    const [items, totalItems] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { userRoles: { role: true } },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return buildPaginatedResponse(
      items,
      pagination.page,
      pagination.limit,
      totalItems,
    );
  }

  async create(dto: CreateUserDto): Promise<User> {
    // Password hash is generated server-side to avoid storing plain secrets.
    const passwordHash = await argon2.hash(dto.password);

    const user = this.userRepository.create({
      email: dto.email.trim().toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role,
      status: dto.status ?? UserStatus.ACTIF,
    });

    return this.userRepository.save(user);
  }

  async getById(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.getById(userId);

    // Only update fields present in payload to keep PATCH semantics predictable.
    if (dto.email !== undefined) {
      user.email = dto.email.trim().toLowerCase();
    }
    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone;
    }
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.status !== undefined) {
      user.status = dto.status;
    }
    if (dto.password !== undefined) {
      user.passwordHash = await argon2.hash(dto.password);
    }

    return this.userRepository.save(user);
  }

  async remove(userId: string): Promise<{ message: string }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete({ id: userId });
    return { message: 'User deleted successfully' };
  }

  async updateStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = status;
    return this.userRepository.save(user);
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.userRepository.update({ id: userId }, { passwordHash });
  }
}
