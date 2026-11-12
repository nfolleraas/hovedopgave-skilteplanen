import { Injectable } from '@nestjs/common';
import { Document, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a document record.
   * @param document - The document data to create
   * @returns The created document
   */
  async add(document: Prisma.DocumentCreateInput): Promise<Document> {
    return await this.prisma.document.create({ data: document });
  }

  /**
   * Retrieves every document with its optional sign plan relation.
   * @returns The stored documents
   */
  async getAll(): Promise<Document[]> {
    return await this.prisma.document.findMany({ include: { signPlan: true } });
  }

  /**
   * Retrieves a document by its unique identifier with its optional sign plan relation.
   * @param uuid - The document identifier
   * @returns The matching document
   */
  async get(uuid: string): Promise<Document> {
    return await this.prisma.document.findUniqueOrThrow({
      where: { uuid },
      include: { signPlan: true },
    });
  }

  /**
   * Deletes a document record by its unique identifier.
   * @param uuid - The document identifier
   * @returns The deleted document
   */
  async delete(uuid: string): Promise<Document> {
    return await this.prisma.document.delete({ where: { uuid } });
  }
}
