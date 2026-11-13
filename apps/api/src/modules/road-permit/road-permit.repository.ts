import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { ApplicationType, Status } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma.service.js';
import type { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import type { CreateRoadPermitData } from './mappers/road-permit.mapper.js';

const editableDraft = {
  type: ApplicationType.RoadUsePermit,
  status: Status.Draft,
  roadUsePermit: null,
} satisfies Prisma.ApplicationWhereInput;

@Injectable()
export class RoadPermitRepository {
  /** Receives the Prisma client that runs road-permit transactions. */
  constructor(private readonly prisma: PrismaService) {}

  /** Creates an application before its permit, applicant, or location details exist. */
  create() {
    return this.prisma.application.create({
      data: {
        title: '',
        applicantReference: '',
        type: ApplicationType.RoadUsePermit,
        status: Status.Draft,
        roadPermitDraft: {},
      },
      select: { caseNumber: true, status: true },
    });
  }

  /** Finalizes the draft and creates its linked records in one transaction. */
  async submit(id: string, data: CreateRoadPermitData) {
    return this.prisma.$transaction(async (prisma) => {
      const draft = await prisma.application.updateMany({
        where: { ...editableDraft, caseNumber: id },
        data: { status: Status.InProgress },
      });
      if (!draft.count) {
        throw new ConflictException(
          'The application is no longer an editable draft.',
        );
      }

      const { roadUsePermit, ...applicationData } = data;
      const application = await prisma.application.update({
        where: { caseNumber: id },
        data: {
          ...applicationData,
          roadPermitDraft: Prisma.DbNull,
        },
      });
      await prisma.roadUsePermit.create({
        data: {
          ...roadUsePermit.create,
          applicationId: application.caseNumber,
          application: { connect: { caseNumber: application.caseNumber } },
        },
      });

      return { caseNumber: application.caseNumber, status: application.status };
    });
  }

  /** Lists draft summaries and identifies drafts that the road-permit form can open. */
  async findAll() {
    const drafts = await this.prisma.application.findMany({
      where: { status: Status.Draft },
      select: {
        caseNumber: true,
        title: true,
        type: true,
        roadUsePermit: { select: { applicationId: true } },
      },
      orderBy: [{ title: 'asc' }, { caseNumber: 'asc' }],
    });

    return drafts.map(({ caseNumber, title, type, roadUsePermit }) => ({
      caseNumber,
      title,
      canResume: type === editableDraft.type && roadUsePermit === null,
    }));
  }

  /** Returns the saved form snapshot for an editable draft. */
  async findOne(id: string) {
    const draft = await this.prisma.application.findFirst({
      where: { ...editableDraft, caseNumber: id },
      select: { caseNumber: true, status: true, roadPermitDraft: true },
    });
    if (!draft) throw new NotFoundException('Road-permit draft not found.');
    return draft;
  }

  /** Stores unfinished form values only while the application is still a draft. */
  async update(id: string, dto: UpdateRoadPermitDto) {
    const {
      title,
      municipalityName,
      materials,
      materialDraft,
      usageDetails,
      contactInformation,
      roadMarking,
    } = dto;
    const draft = await this.prisma.application.updateMany({
      where: { ...editableDraft, caseNumber: id },
      data: {
        title: title?.trim(),
        roadPermitDraft: {
          title,
          municipalityName,
          materials,
          materialDraft,
          usageDetails,
          contactInformation,
          roadMarking,
        },
      },
    });
    if (!draft.count) {
      throw new ConflictException(
        'The application is no longer an editable draft.',
      );
    }
    return { caseNumber: id, status: Status.Draft };
  }

  /** Returns placeholder text for removal by permit ID. */
  remove(id: number) {
    return `This action removes a #${id} roadPermit`;
  }
}
