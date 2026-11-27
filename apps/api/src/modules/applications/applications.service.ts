import { Injectable } from '@nestjs/common';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';

@Injectable()
export class ApplicationsService {
  create(createApplicationDto: CreateApplicationDto): string {
    return 'This action adds a new application';
  }

  findAll(): string {
    return `This action returns all applications`;
  }

  findOne(id: number): string {
    return `This action returns a #${id} application`;
  }

  update(id: number, updateApplicationDto: UpdateApplicationDto): string {
    return `This action updates a #${id} application`;
  }

  remove(id: number): string {
    return `This action removes a #${id} application`;
  }
}
