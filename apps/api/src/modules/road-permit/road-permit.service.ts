import {
  BadRequestException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MunicipalityService } from '../municipality/municipality.service.js';
import { mapCreateRoadPermit } from './mappers/road-permit.mapper.js';
import { RoadPermitRepository } from './road-permit.repository.js';
import {
  parseRoadPermitDraft,
  parseRoadPermitSubmission,
} from './road-permit.validation.js';

@Injectable()
export class RoadPermitService {
  constructor(
    private readonly roadPermitRepository: RoadPermitRepository,
    private readonly municipalities: MunicipalityService,
  ) {}

  /** Starts a blank road-permit application. */
  create() {
    return this.roadPermitRepository.create();
  }

  /** Checks the required submission fields and sends the existing draft for processing. */
  async submit(id: string, input: unknown) {
    const dto = parseRoadPermitSubmission(input);
    const data = mapCreateRoadPermit(dto);
    if (!(await this.municipalities.exists(dto.municipalityName))) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'municipalityName must be a supported municipality.',
        code: 'MUNICIPALITY_UNAVAILABLE',
      });
    }
    return this.roadPermitRepository.submit(id, data);
  }

  /** Returns the summaries of applications in Draft status. */
  findAll() {
    return this.roadPermitRepository.findAll();
  }

  /** Loads the saved form values for the given draft case number. */
  async findOne(id: string) {
    const draft = await this.roadPermitRepository.findOne(id);
    try {
      return {
        ...draft,
        roadPermitDraft: parseRoadPermitDraft(draft.roadPermitDraft ?? {}),
      };
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      throw new UnprocessableEntityException(
        `The saved draft is invalid. ${error.message}`,
        { cause: error },
      );
    }
  }

  /** Saves an unfinished form without applying submission validation. */
  update(id: string, input: unknown) {
    return this.roadPermitRepository.update(id, parseRoadPermitDraft(input));
  }

  /** Passes the numeric permit ID to the repository for removal. */
  remove(id: number) {
    return this.roadPermitRepository.remove(id);
  }
}
