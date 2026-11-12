import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type {
  ApplicationType,
  Availability,
} from '../../generated/prisma/enums.js';
import {
  type ContactPersonApplication,
  ContactPersonsRepository,
} from './contact-persons.repository.js';
import {
  ContactPersonFieldsDto,
  CreateContactPersonDto,
} from './dto/create-contact-person.dto.js';
import { UpdateContactPersonDto } from './dto/update-contact-person.dto.js';
import {
  type ContactPersonResponse,
  toContactPersonResponse,
} from './mappers/contact-person.mapper.js';
import {
  type ContactPersonRuleInput,
  canEditContactPersons,
  defaultAvailability,
  findInvalidContactPersonFields,
  getContactPersonFieldSet,
} from './rules/contact-person-rules.js';

export interface ApplicationContactPersons {
  application: ContactPersonApplication;
  contactPersons: ContactPersonResponse[];
}

@Injectable()
export class ContactPersonsService {
  constructor(private readonly contactPersons: ContactPersonsRepository) {}

  async findByApplication(
    applicationId: string,
  ): Promise<ApplicationContactPersons> {
    const application = await this.getApplication(applicationId);
    const contactPersons =
      await this.contactPersons.getAllByApplication(applicationId);

    return {
      application,
      contactPersons: contactPersons.map(toContactPersonResponse),
    };
  }

  async findOne(id: string): Promise<ContactPersonResponse> {
    return toContactPersonResponse(await this.getContactPerson(id));
  }

  /** Creates a contact person on an application (UC-031). */
  async create(dto: CreateContactPersonDto): Promise<ContactPersonResponse> {
    const application = await this.getApplication(dto.applicationId);
    this.assertEditable(application);
    this.assertNoUnusedFields(application.type, dto);

    const input = this.withResolvedAvailability(application.type, dto);
    this.assertValid(application.type, input);

    try {
      const created = await this.contactPersons.add({
        application: { connect: { caseNumber: application.caseNumber } },
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        email: dto.email,
        // assertValid has already checked that a value is present.
        availability: input.availability as Availability,
      });
      return toContactPersonResponse(created);
    } catch (error) {
      // The schema allows one contact person per application for now.
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'CONTACT_PERSON_ALREADY_EXISTS',
          message: 'The application already has a contact person.',
        });
      }
      throw error;
    }
  }

  /** Updates a contact person's details (UC-033). */
  async update(
    id: string,
    dto: UpdateContactPersonDto,
  ): Promise<ContactPersonResponse> {
    const existing = await this.getContactPerson(id);
    const { application } = existing;
    this.assertEditable(application);
    this.assertNoUnusedFields(application.type, dto);

    const merged = this.withResolvedAvailability(application.type, {
      name: existing.name,
      availability: existing.availability,
      phoneNumber: existing.phoneNumber,
      email: existing.email,
      ...stripUndefined(dto),
    });
    this.assertValid(application.type, merged);

    const updated = await this.contactPersons.update(id, {
      name: dto.name,
      // assertValid has already checked that a value is present.
      availability: merged.availability as Availability,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
    });

    return toContactPersonResponse(updated);
  }

  /** Deletes a contact person from its application (UC-032). */
  async remove(id: string): Promise<void> {
    const contactPerson = await this.getContactPerson(id);
    this.assertEditable(contactPerson.application);

    await this.contactPersons.delete(id);
  }

  private async getApplication(
    applicationId: string,
  ): Promise<ContactPersonApplication> {
    try {
      return await this.contactPersons.getApplication(applicationId);
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw new NotFoundException({
          code: 'APPLICATION_NOT_FOUND',
          message: `Application ${applicationId} was not found.`,
        });
      }
      throw error;
    }
  }

  private async getContactPerson(id: string) {
    try {
      return await this.contactPersons.getById(id);
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw new NotFoundException({
          code: 'CONTACT_PERSON_NOT_FOUND',
          message: `Contact person ${id} was not found.`,
        });
      }
      throw error;
    }
  }

  private assertEditable(application: ContactPersonApplication): void {
    if (!canEditContactPersons(application.status)) {
      throw new ConflictException({
        code: 'APPLICATION_NOT_EDITABLE',
        message:
          'Contact persons can only be changed while the application is a ' +
          'draft or requires changes.',
      });
    }
  }

  /**
   * Road use applications always use Day, so a chosen availability is
   * rejected for them (UC-031 A1, UC-033 A1).
   */
  private assertNoUnusedFields(
    type: ApplicationType,
    fields: Partial<ContactPersonFieldsDto>,
  ): void {
    const fieldSet = getContactPersonFieldSet(type);
    if (!fieldSet.availability && fields.availability != null) {
      throw new BadRequestException({
        code: 'CONTACT_PERSON_FIELDS_NOT_ALLOWED',
        message: `Fields not used for ${type}: availability.`,
        invalidFields: ['availability'],
      });
    }
  }

  private assertValid(
    type: ApplicationType,
    input: ContactPersonRuleInput,
  ): void {
    const invalidFields = findInvalidContactPersonFields(type, input);
    if (invalidFields.length > 0) {
      throw new BadRequestException({
        code: 'CONTACT_PERSON_INVALID',
        message:
          'Missing or invalid contact person fields: ' +
          `${invalidFields.join(', ')}.`,
        invalidFields,
      });
    }
  }

  /** Sets availability to Day when the applicant cannot choose one. */
  private withResolvedAvailability(
    type: ApplicationType,
    input: ContactPersonRuleInput,
  ): ContactPersonRuleInput {
    const fieldSet = getContactPersonFieldSet(type);
    return fieldSet.availability
      ? input
      : { ...input, availability: defaultAvailability };
  }
}

/** Prisma's error code when findUniqueOrThrow finds no record. */
function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

/** Prisma's error code when a unique constraint is violated. */
function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}
