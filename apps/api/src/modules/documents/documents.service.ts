import { Injectable } from '@nestjs/common';
import { DocumentsRepository } from './documents.repository.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

@Injectable()
export class DocumentsService {
  constructor(private readonly documentsRepository: DocumentsRepository) {}

  // TODO: Du skal kunne oprette et dokument som ikke hører til en skilteplan
  create(dto: CreateDocumentDto) {
    return this.documentsRepository.add({
      name: dto.name,
      documentType: dto.documentType,
      url: dto.url,
      application: {
        connect: {
          caseNumber: dto.applicationId,
        },
      },
      signPlan: {
        connect: {
          uuid: dto.signPlanId,
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
      documentType: dto.documentType,
      url: dto.url,
    });
  }

  remove(uuid: string) {
    return this.documentsRepository.delete(uuid);
  }
}
