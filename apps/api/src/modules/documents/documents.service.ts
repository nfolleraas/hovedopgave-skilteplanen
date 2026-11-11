import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { DocumentType } from '../../generated/prisma/enums.js';
import { getAllowedDocumentFileExtension } from '../../utils/allowed-document-file-extensions.js';
import { R2Service } from '../s3/r2.service.js';
import { DocumentsRepository } from './documents.repository.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly r2Service: R2Service,
  ) {}

  async create(dto: CreateDocumentDto, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('A document file is required.');

    const extension = getAllowedDocumentFileExtension(
      file.originalname,
      file.mimetype,
    );

    if (!extension) {
      throw new BadRequestException(
        'Only PDF, JPG, and PNG files are allowed.',
      );
    }

    const documentType = dto.documentType ?? DocumentType.Other;
    if (documentType === DocumentType.SignPlan) {
      throw new BadRequestException(
        'Sign plans must be created through the sign plans module.',
      );
    }

    const key = `applications/${dto.applicationId}/documents/${randomUUID()}.${extension}`;

    try {
      await this.r2Service.upload(key, file.buffer, file.mimetype);
    } catch (error) {
      console.error('R2 upload failed: ', error);
      throw error;
    }

    const url = `${process.env.PUBLIC_URL}/${key}`;

    try {
      return await this.documentsRepository.add({
        name: dto.name,
        documentType,
        url,
        r2ObjectKey: key,
        application: {
          connect: {
            caseNumber: dto.applicationId,
          },
        },
      });
    } catch (error) {
      try {
        await this.r2Service.delete(key);
      } catch (error) {
        console.error(
          'Failed to delete document from R2 after unsuccessfully trying to create a document.\n\n',
          error,
        );
        throw error;
      }
      console.error(
        'Failed to insert the document in the database. The R2 document has been deleted.\n\n',
        error,
      );
      throw error;
    }
  }

  async findAll() {
    return await this.documentsRepository.getAll();
  }

  async findOne(uuid: string) {
    return await this.documentsRepository.get(uuid);
  }

  async remove(uuid: string) {
    try {
      const document = await this.documentsRepository.delete(uuid);

      try {
        await this.r2Service.delete(document.r2ObjectKey);
      } catch (error) {
        console.error('Failed to delete document from R2.\n\n', error);
      }
    } catch (error) {
      console.error('Failed to remove document from the database.\n\n', error);
      throw error;
    }
  }
}
