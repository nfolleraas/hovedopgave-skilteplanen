import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { type ApplicationType, Status } from '../../generated/prisma/enums.js';
import { type AreaApplication, AreasRepository } from './areas.repository.js';
import {
  AreaCreateFieldsDto,
  AreaFieldsDto,
  CreateAreaDto,
} from './dto/create-area.dto.js';
import { CreateAreasDto } from './dto/create-areas.dto.js';
import { UpdateAreaDto } from './dto/update-area.dto.js';
import {
  type AreaResponse,
  type AreaWithRelations,
  toAreaResponse,
} from './mappers/area.mapper.js';
import {
  type AreaRuleInput,
  calculateAreaInSquareMeters,
  canEditAreas,
  findInvalidAreaFields,
  getAreaFieldSet,
  normalizeHouseNumber,
} from './rules/area-rules.js';

const detailFields = [
  'roadSection',
  'roadSectionDescription',
  'roadSide',
  'direction',
  'lengthInMeters',
  'widthInMeters',
  'depthInMeters',
] as const;

export interface ApplicationAreas {
  application: AreaApplication;
  areas: AreaResponse[];
}

@Injectable()
export class AreasService {
  /**
   * Creates the service for area business rules.
   * @param areas - Repository for area data access
   */
  constructor(private readonly areas: AreasRepository) {}

  /**
   * Finds an application and all of its areas.
   * @param applicationId - The case number of the application
   * @returns The application and its areas
   * @throws NotFoundException if the application does not exist
   */
  async findByApplication(applicationId: string): Promise<ApplicationAreas> {
    const application = await this.getApplication(applicationId);
    const areas = await this.areas.getAllByApplication(applicationId);

    return { application, areas: areas.map(toAreaResponse) };
  }

  /**
   * Finds one area.
   * @param id - The ID of the area
   * @returns The area
   * @throws NotFoundException if the area does not exist
   */
  async findOne(id: string): Promise<AreaResponse> {
    return toAreaResponse(await this.getArea(id));
  }

  /**
   * Creates one area by reusing the rules for creating several areas.
   * @param dto - The application ID and the area fields
   * @returns The created area
   */
  async create(dto: CreateAreaDto): Promise<AreaResponse> {
    const { applicationId, ...fields } = dto;
    const [area] = await this.createMany({ applicationId, areas: [fields] });
    return area;
  }

  /**
   * Creates one area per selected road (UC-034).
   * @param dto - The application ID and the areas to create
   * @returns The created areas
   * @throws ConflictException if the application can no longer be edited
   * @throws BadRequestException if an area has unused or invalid fields
   */
  async createMany(dto: CreateAreasDto): Promise<AreaResponse[]> {
    const application = await this.getApplication(dto.applicationId);
    this.assertEditable(application);

    const created = await this.areas.addMany(
      dto.areas.map((fields) => this.toCreateData(application, fields)),
    );

    return created.map(toAreaResponse);
  }

  /**
   * Updates an area and its details (UC-036). The changed fields are merged
   * with the stored values before the whole area is validated.
   * @param id - The ID of the area
   * @param dto - The fields to change
   * @returns The updated area
   * @throws ConflictException if the application can no longer be edited
   * @throws BadRequestException if the merged area is invalid
   */
  async update(id: string, dto: UpdateAreaDto): Promise<AreaResponse> {
    const existing = await this.getArea(id);
    const { application } = existing;
    this.assertEditable(application);
    this.assertNoUnusedFields(application.type, dto);

    const merged = { ...flattenRuleInput(existing), ...stripUndefined(dto) };
    this.assertValid(application.type, merged);

    const updated = await this.areas.update(id, {
      roadName: dto.roadName,
      roadOwnership: dto.roadOwnership,
      postalCode: dto.postalCode,
      houseNumberFrom: normalizeOptionalHouseNumber(dto.houseNumberFrom),
      houseNumberTo: normalizeOptionalHouseNumber(dto.houseNumberTo),
      alternativeDescription: dto.alternativeDescription,
      ...this.toDetailUpsert(application.type, merged),
    });

    if (application.status === Status.ChangeRequired) {
      // TODO(UC-017): Notify the case worker that an area was changed when a
      // notification service exists.
    }

    return toAreaResponse(updated);
  }

  /**
   * Deletes an area with its detail and size records (UC-035).
   * @param id - The ID of the area
   * @returns A promise that resolves when the area is deleted
   * @throws BadRequestException if it is the last area of the application
   */
  async remove(id: string): Promise<void> {
    const area = await this.getArea(id);
    this.assertEditable(area.application);

    const areaCount = await this.areas.countByApplication(area.applicationId);
    if (areaCount <= 1) {
      throw new BadRequestException({
        code: 'LAST_AREA',
        message: 'An application must have at least one area.',
      });
    }

    await this.areas.delete(id);

    if (area.application.status === Status.ChangeRequired) {
      // TODO(UC-017): Notify the case worker that an area was deleted when a
      // notification service exists.
    }
  }

  /**
   * Gets the application and translates Prisma's not-found error.
   * @param applicationId - The case number of the application
   * @returns The case number, type and status of the application
   * @throws NotFoundException if the application does not exist
   */
  private async getApplication(
    applicationId: string,
  ): Promise<AreaApplication> {
    try {
      return await this.areas.getApplication(applicationId);
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

  /**
   * Gets the area and translates Prisma's not-found error.
   * @param id - The ID of the area
   * @returns The area with its detail, size and application
   * @throws NotFoundException if the area does not exist
   */
  private async getArea(id: string) {
    try {
      return await this.areas.getById(id);
    } catch (error) {
      if (isRecordNotFound(error)) {
        throw new NotFoundException({
          code: 'AREA_NOT_FOUND',
          message: `Area ${id} was not found.`,
        });
      }
      throw error;
    }
  }

  /**
   * Ensures that the application's areas may still be changed.
   * @param application - The application the areas belong to
   * @throws ConflictException if the status does not allow changes
   */
  private assertEditable(application: AreaApplication): void {
    if (!canEditAreas(application.status)) {
      throw new ConflictException({
        code: 'APPLICATION_NOT_EDITABLE',
        message:
          'Areas can only be changed while the application is a draft or ' +
          'requires changes.',
      });
    }
  }

  /**
   * Rejects detail fields that the application type does not use.
   * @param type - The application type
   * @param fields - The area fields sent by the client
   * @throws BadRequestException if a field is not used for the type
   */
  private assertNoUnusedFields(
    type: ApplicationType,
    fields: Partial<AreaFieldsDto>,
  ): void {
    const fieldSet = getAreaFieldSet(type);
    const unused = detailFields.filter((field) => {
      if (fields[field] === undefined || fields[field] === null) return false;
      if (field === 'direction') return !fieldSet.direction;
      if (field === 'depthInMeters') return !fieldSet.depth;
      return false;
    });

    if (unused.length > 0) {
      throw new BadRequestException({
        code: 'AREA_FIELDS_NOT_ALLOWED',
        message: `Fields not used for ${type}: ${unused.join(', ')}.`,
        invalidFields: unused,
      });
    }
  }

  /**
   * Ensures that all required area fields are present and valid.
   * @param type - The application type
   * @param input - The area values to check
   * @throws BadRequestException if any field is missing or invalid
   */
  private assertValid(type: ApplicationType, input: AreaRuleInput): void {
    const invalidFields = findInvalidAreaFields(type, input);
    if (invalidFields.length > 0) {
      throw new BadRequestException({
        code: 'AREA_INVALID',
        message: `Missing or invalid area fields: ${invalidFields.join(', ')}.`,
        invalidFields,
      });
    }
  }

  /**
   * Maps area fields to Prisma create data. New areas from the road search
   * only need the road. If any detail is sent, the whole area must be valid so
   * no half-filled details are stored.
   * @param application - The application the area belongs to
   * @param fields - The area fields sent by the client
   * @returns The Prisma create input for the area
   */
  private toCreateData(
    application: AreaApplication,
    fields: AreaCreateFieldsDto,
  ): Prisma.AreaCreateInput {
    this.assertNoUnusedFields(application.type, fields);

    const hasDetails = detailFields.some(
      (field) => fields[field] !== undefined && fields[field] !== null,
    );
    if (hasDetails) {
      this.assertValid(application.type, fields);
    }

    return {
      application: { connect: { caseNumber: application.caseNumber } },
      roadName: fields.roadName,
      roadOwnership: fields.roadOwnership,
      postalCode: fields.postalCode,
      houseNumberFrom: normalizeHouseNumber(fields.houseNumberFrom),
      houseNumberTo: normalizeHouseNumber(fields.houseNumberTo),
      alternativeDescription: fields.alternativeDescription ?? null,
      isManual: fields.isManual ?? false,
      ...(hasDetails ? this.toDetailCreate(application.type, fields) : {}),
    };
  }

  /**
   * Builds the detail and size values for an area that has been validated.
   * @param type - The application type, which decides the used fields
   * @param input - The validated area values
   * @returns The detail and size values, including the calculated area
   */
  private toDetailValues(type: ApplicationType, input: AreaRuleInput) {
    const fieldSet = getAreaFieldSet(type);
    // assertValid has already checked that these values are present.
    const length = input.lengthInMeters as number;
    const width = input.widthInMeters as number;

    return {
      detail: {
        roadSection: input.roadSection as NonNullable<
          AreaRuleInput['roadSection']
        >,
        roadSectionDescription:
          input.roadSection === 'Other'
            ? (input.roadSectionDescription ?? null)
            : null,
        roadSide: input.roadSide as NonNullable<AreaRuleInput['roadSide']>,
        direction: fieldSet.direction ? (input.direction ?? null) : null,
      },
      size: {
        lengthInMeters: length,
        widthInMeters: width,
        depthInMeters: fieldSet.depth ? (input.depthInMeters ?? null) : null,
        areaInSquareMeters: calculateAreaInSquareMeters(length, width),
      },
    };
  }

  /**
   * Builds nested Prisma create data for the area detail and size.
   * @param type - The application type
   * @param input - The validated area values
   * @returns The nested create input
   */
  private toDetailCreate(type: ApplicationType, input: AreaRuleInput) {
    const { detail, size } = this.toDetailValues(type, input);
    return {
      areaDetail: { create: detail },
      areaSize: { create: size },
    };
  }

  /**
   * Builds nested Prisma upsert data for the area detail and size, so details
   * are created for areas that did not have any.
   * @param type - The application type
   * @param input - The validated area values
   * @returns The nested upsert input
   */
  private toDetailUpsert(type: ApplicationType, input: AreaRuleInput) {
    const { detail, size } = this.toDetailValues(type, input);
    return {
      areaDetail: { upsert: { create: detail, update: detail } },
      areaSize: { upsert: { create: size, update: size } },
    };
  }
}

/**
 * Checks for Prisma's error code when findUniqueOrThrow finds no record.
 * @param error - The caught error
 * @returns True if the error means that the record was not found
 */
function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

/**
 * Flattens a stored area into the shape used by the area rules.
 * @param area - The stored area with its relations
 * @returns The area values used for validation
 */
function flattenRuleInput(area: AreaWithRelations): AreaRuleInput {
  const response = toAreaResponse(area);
  return {
    houseNumberFrom: response.houseNumberFrom,
    houseNumberTo: response.houseNumberTo,
    alternativeDescription: response.alternativeDescription,
    roadSection: response.roadSection,
    roadSectionDescription: response.roadSectionDescription,
    roadSide: response.roadSide,
    direction: response.direction,
    lengthInMeters: response.lengthInMeters,
    widthInMeters: response.widthInMeters,
    depthInMeters: response.depthInMeters,
  };
}

/**
 * Normalizes a house number for an update, but leaves an omitted field out
 * (undefined) instead of clearing it.
 * @param value - The house number sent by the client
 * @returns The normalized house number, null, or undefined if omitted
 */
function normalizeOptionalHouseNumber(
  value: string | null | undefined,
): string | null | undefined {
  return value === undefined ? undefined : normalizeHouseNumber(value);
}

/**
 * Removes properties whose value is undefined.
 * @param value - The object to copy
 * @returns A copy without undefined properties
 */
function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}
