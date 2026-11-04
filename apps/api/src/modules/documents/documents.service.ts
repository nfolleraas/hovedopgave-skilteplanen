import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentType } from '../../generated/prisma/enums.js';
import { DocumentsRepository } from './documents.repository.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

@Injectable()
export class DocumentsService {
  constructor(private readonly documentsRepository: DocumentsRepository) {}

  create(dto: CreateDocumentDto) {
    const documentType = dto.documentType ?? DocumentType.Other;

    if (documentType === DocumentType.SignPlan) {
      throw new BadRequestException(
        'Sign plans must be created through the sign plans module',
      );
    }

    return this.documentsRepository.add({
      name: dto.name,
      documentType,
      url: dto.url,
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
