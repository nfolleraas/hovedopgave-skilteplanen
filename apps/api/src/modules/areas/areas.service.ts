import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type ApplicationType, Status } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AreaFieldsDto, CreateAreaDto } from './dto/create-area.dto.js';
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
} from './rules/area-rules.js';

const areaInclude = { areaDetail: true, areaSize: true } as const;

const detailFields = [
  'roadSection',
  'roadSectionDescription',
  'roadSide',
  'direction',
  'lengthInMeters',
  'widthInMeters',
  'depthInMeters',
] as const;

interface EditableApplication {
  caseNumber: string;
  type: ApplicationType;
  status: Status;
}

export interface ApplicationAreas {
  application: EditableApplication;
  areas: AreaResponse[];
}

@Injectable()
export class AreasService {
  constructor(private readonly prisma: PrismaService) {}

  async findByApplication(applicationId: string): Promise<ApplicationAreas> {
    const application = await this.getApplication(applicationId);
    const areas = await this.prisma.area.findMany({
      where: { applicationId },
      include: areaInclude,
      orderBy: { uuid: 'asc' },
    });

    return { application, areas: areas.map(toAreaResponse) };
  }

  async findOne(id: string): Promise<AreaResponse> {
    const area = await this.prisma.area.findUnique({
      where: { uuid: id },
      include: areaInclude,
    });
    if (!area) {
      throw this.areaNotFound(id);
    }

    return toAreaResponse(area);
  }

  async create(dto: CreateAreaDto): Promise<AreaResponse> {
    const { applicationId, ...fields } = dto;
    const [area] = await this.createMany({ applicationId, areas: [fields] });
    return area;
  }

  /** Creates one area per selected road (UC-034). */
  async createMany(dto: CreateAreasDto): Promise<AreaResponse[]> {
    const application = await this.getApplication(dto.applicationId);
    this.assertEditable(application);

    const created = await this.prisma.$transaction(
      dto.areas.map((fields) =>
        this.prisma.area.create({
          data: this.toCreateData(application, fields),
          include: areaInclude,
        }),
      ),
    );

    return created.map(toAreaResponse);
  }

  /** Updates an area and its details (UC-036). */
  async update(id: string, dto: UpdateAreaDto): Promise<AreaResponse> {
    const existing = await this.prisma.area.findUnique({
      where: { uuid: id },
      include: { ...areaInclude, application: true },
    });
    if (!existing) {
      throw this.areaNotFound(id);
    }

    const { application } = existing;
    this.assertEditable(application);
    this.assertNoUnusedFields(application.type, dto);

    const merged = { ...flattenRuleInput(existing), ...stripUndefined(dto) };
    this.assertValid(application.type, merged);

    const updated = await this.prisma.area.update({
      where: { uuid: id },
      data: {
        roadName: dto.roadName,
        roadOwnership: dto.roadOwnership,
        postalCode: dto.postalCode,
        houseNumberFrom: dto.houseNumberFrom,
        houseNumberTo: dto.houseNumberTo,
        alternativeDescription: dto.alternativeDescription,
        ...this.toDetailUpsert(application.type, merged),
      },
      include: areaInclude,
    });

    if (application.status === Status.ChangeRequired) {
      // TODO(UC-017): Notify the case worker that an area was changed when a
      // notification service exists.
    }

    return toAreaResponse(updated);
  }

  /** Deletes an area with its detail and size records (UC-035). */
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const area = await tx.area.findUnique({
        where: { uuid: id },
        include: { application: true },
      });
      if (!area) {
        throw this.areaNotFound(id);
      }
      this.assertEditable(area.application);

      const areaCount = await tx.area.count({
        where: { applicationId: area.applicationId },
      });
      if (areaCount <= 1) {
        throw new BadRequestException({
          code: 'LAST_AREA',
          message: 'An application must have at least one area.',
        });
      }

      // The area holds the foreign keys, so it is deleted first.
      await tx.area.delete({ where: { uuid: id } });
      if (area.areaDetailId) {
        await tx.areaDetail.delete({ where: { uuid: area.areaDetailId } });
      }
      if (area.areaSizeId) {
        await tx.areaSize.delete({ where: { uuid: area.areaSizeId } });
      }

      if (area.application.status === Status.ChangeRequired) {
        // TODO(UC-017): Notify the case worker that an area was deleted when
        // a notification service exists.
      }
    });
  }

  private async getApplication(
    applicationId: string,
  ): Promise<EditableApplication> {
    const application = await this.prisma.application.findUnique({
      where: { caseNumber: applicationId },
      select: { caseNumber: true, type: true, status: true },
    });
    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: `Application ${applicationId} was not found.`,
      });
    }

    return application;
  }

  private assertEditable(application: EditableApplication): void {
    if (!canEditAreas(application.status)) {
      throw new ConflictException({
        code: 'APPLICATION_NOT_EDITABLE',
        message:
          'Areas can only be changed while the application is a draft or ' +
          'requires changes.',
      });
    }
  }

  /** Rejects detail fields that the application type does not use. */
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
   * New areas from the road search only need the road. If any detail is
   * sent, the whole area must be valid so no half-filled details are stored.
   */
  private toCreateData(
    application: EditableApplication,
    fields: AreaFieldsDto,
  ) {
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
      houseNumberFrom: fields.houseNumberFrom ?? null,
      houseNumberTo: fields.houseNumberTo ?? null,
      alternativeDescription: fields.alternativeDescription ?? null,
      ...(hasDetails ? this.toDetailCreate(application.type, fields) : {}),
    };
  }

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

  private toDetailCreate(type: ApplicationType, input: AreaRuleInput) {
    const { detail, size } = this.toDetailValues(type, input);
    return {
      areaDetail: { create: detail },
      areaSize: { create: size },
    };
  }

  private toDetailUpsert(type: ApplicationType, input: AreaRuleInput) {
    const { detail, size } = this.toDetailValues(type, input);
    return {
      areaDetail: { upsert: { create: detail, update: detail } },
      areaSize: { upsert: { create: size, update: size } },
    };
  }

  private areaNotFound(id: string): NotFoundException {
    return new NotFoundException({
      code: 'AREA_NOT_FOUND',
      message: `Area ${id} was not found.`,
    });
  }
}

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

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}
