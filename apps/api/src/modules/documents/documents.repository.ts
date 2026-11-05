import { Injectable } from '@nestjs/common';
import { Document, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(document: Prisma.DocumentCreateInput): Promise<Document> {
    return await this.prisma.document.create({ data: document });
  }

  async getAll(): Promise<Document[]> {
    return await this.prisma.document.findMany();
  }

  async getById(uuid: string): Promise<Document> {
    return await this.prisma.document.findUniqueOrThrow({
      where: { uuid },
    });
  }

  async update(
    uuid: string,
    updatedDocument: Prisma.DocumentUpdateInput,
  ): Promise<Document> {
    return await this.prisma.document.update({
      where: { uuid },
      data: updatedDocument,
    });
  }

  async delete(uuid: string): Promise<Document> {
    return await this.prisma.document.delete({ where: { uuid } });
  }
}
