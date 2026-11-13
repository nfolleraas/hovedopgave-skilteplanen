import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentType } from '../../generated/prisma/client.js';
import { getAllowedDocumentFileExtension } from '../../utils/allowed-document-file-extensions.js';
import { R2Service } from '../s3/r2.service.js';
import { CreateSignPlanDto } from './dto/create-sign-plan.dto.js';
import { mapCreateSignPlan } from './mappers/sign-plan.mapper.js';
import { SignPlansRepository } from './sign-plans.repository.js';

@Injectable()
export class SignPlansService {
  constructor(
    private readonly signPlanRepository: SignPlansRepository,
    private readonly r2Service: R2Service,
  ) {}

  /**
   * Validates and uploads a sign plan before persisting its records.
   * @param dto - The metadata for the sign plan
   * @param file - The uploaded sign plan file
   * @returns The newly created sign plan
   */
  async create(dto: CreateSignPlanDto, file: Express.Multer.File) {
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

    const documentType = dto.documentType ?? DocumentType.SignPlan;
    if (documentType === DocumentType.Other) {
      throw new BadRequestException(
        'Documents must be created through the documents module.',
      );
    }

    const key = `applications/${dto.applicationId}/sign-plans/${randomUUID()}.${extension}`;

    try {
      await this.r2Service.upload(key, file.buffer, file.mimetype);
    } catch (error) {
      console.error('R2 upload failed: ', error);
      throw error;
    }

    const url = `${process.env.PUBLIC_URL}/${key}`;

    const mappedCreateSignPlan = mapCreateSignPlan(dto, url, key);

    try {
      return await this.signPlanRepository.add(mappedCreateSignPlan);
    } catch (error) {
      try {
        await this.r2Service.delete(key);
      } catch (error) {
        console.error(
          'Failed to delete sign plan from R2 after unsuccessfully trying to create a sign plan.\n\n',
          error,
        );
        throw error;
      }
      console.error(
        'Failed to insert the sign plan in the database. The R2 sign plan has been deleted.\n\n',
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieves a sign plan by its document identifier and validates its existence before returning.
   * @param uuid - The related document identifier
   * @returns The matching sign plan
   */
  async findOne(uuid: string) {
    const signPlan = await this.signPlanRepository.getById(uuid);

    if (!signPlan) {
      throw new NotFoundException(`Sign plan ${uuid} not found.`);
    }

    return signPlan;
  }
}
