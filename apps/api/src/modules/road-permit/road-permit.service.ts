import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRoadPermitDto } from './dto/create-road-permit.dto.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import { mapCreateRoadPermit } from './mappers/road-permit.mapper.js';
import { RoadPermitRepository } from './road-permit.repository.js';

@Injectable()
export class RoadPermitService {
  /** Receives the repository used for road-permit operations. */
  constructor(private readonly roadPermitRepository: RoadPermitRepository) {}

  /** Starts a blank road-permit application. */
  create() {
    return this.roadPermitRepository.create();
  }

  /** Checks the required submission fields and sends the existing draft for processing. */
  async submit(id: string, dto: CreateRoadPermitDto) {
    const usage = dto?.usageDetails;
    const contact = dto?.contactInformation;
    if (
      dto?.confirmed !== true ||
      !dto.title?.trim() ||
      !dto.municipalityName?.trim() ||
      !usage?.road?.trim() ||
      !/^\d{4}$/.test(usage.postalCode?.trim()) ||
      !usage.city?.trim() ||
      !['Byggearbejde', 'Arrangement', 'Andet'].includes(usage.usage) ||
      !Number.isFinite(Date.parse(usage.startDate)) ||
      !Number.isFinite(Date.parse(usage.endDate)) ||
      Date.parse(usage.endDate) < Date.parse(usage.startDate) ||
      !contact?.name?.trim() ||
      !contact.phone?.trim() ||
      !contact.email?.trim() ||
      !Array.isArray(dto.materials) ||
      !Array.isArray(dto.roadMarking?.trafficChanges) ||
      !Array.isArray(dto.roadMarking?.trafficPrecautions) ||
      !dto.applicant
    ) {
      throw new BadRequestException(
        'Complete the application before submitting.',
      );
    }

    return this.roadPermitRepository.submit(id, mapCreateRoadPermit(dto));
  }

  /** Returns the summaries of applications in Draft status. */
  findAll() {
    return this.roadPermitRepository.findAll();
  }

  /** Loads the saved form values for the given draft case number. */
  findOne(id: string) {
    return this.roadPermitRepository.findOne(id);
  }

  /** Saves an unfinished form without applying submission validation. */
  update(id: string, updateRoadPermitDto: UpdateRoadPermitDto) {
    return this.roadPermitRepository.update(id, updateRoadPermitDto);
  }

  /** Passes the numeric permit ID to the repository for removal. */
  remove(id: number) {
    return this.roadPermitRepository.remove(id);
  }
}
