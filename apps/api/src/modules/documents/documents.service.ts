import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DocumentType } from '../../generated/prisma/enums.js';
import { R2Service } from '../s3/r2.service.js';
import { DocumentsRepository } from './documents.repository.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly r2Service: R2Service,
  ) {}

  async create(dto: CreateDocumentDto, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('A document file is required.');

    const key = `documents/${randomUUID()}-${file.originalname}`;

    await this.r2Service.upload(key, file.buffer, file.mimetype);

    const url = `${process.env.R2_PUBLIC_URL}/${key}`;

    const documentType = dto.documentType ?? DocumentType.Other;
    if (documentType === DocumentType.SignPlan) {
      throw new BadRequestException(
        'Sign plans must be created through the sign plans module',
      );
    }

    return this.documentsRepository.add({
      name: dto.name,
      documentType,
      url,
      application: {
        connect: {
          caseNumber: dto.applicationId,
        },
      },
    });
  }

  findAll() {
    return this.documentsRepository.getAll();
  }

  findOne(uuid: string) {
    return this.documentsRepository.getById(uuid);
  }

  update(uuid: string, dto: UpdateDocumentDto) {
    return this.documentsRepository.update(uuid, {
      name: dto.name,
      url: dto.url,
    });
  }

  remove(uuid: string) {
    return this.documentsRepository.delete(uuid);
  }
}
