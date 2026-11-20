import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateMunicipalityDto } from './dto/create-municipality.dto.js';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto.js';
import {
  MunicipalitiesRepository,
  type MunicipalityWithAddress,
} from './municipalities.repository.js';
import {
  validateCreateMunicipality,
  validateUpdateMunicipality,
} from './municipalities.validator.js';

@Injectable()
export class MunicipalitiesService {
  private readonly logger = new Logger(MunicipalitiesService.name);

  /**
   * Receives the repository that performs database operations for
   * municipalities.
   */
  constructor(
    private readonly municipalitiesRepository: MunicipalitiesRepository,
  ) {}

  /**
   * Looks up the municipality and includes its address.
   *
   * @throws NotFoundException if the ID does not match a municipality.
   */
  async findById(id: number): Promise<MunicipalityWithAddress> {
    const municipality = await this.municipalitiesRepository.findById(id);

    if (!municipality) {
      throw new NotFoundException('Kommunen blev ikke fundet');
    }

    return municipality;
  }

  /**
   * Validates the creation request and saves the municipality with its
   * address. Returns the record saved by the database.
   */
  async create(data: CreateMunicipalityDto): Promise<MunicipalityWithAddress> {
    validateCreateMunicipality(data);

    const municipality = await this.municipalitiesRepository.create(data);

    this.logger.log({
      municipalityName: municipality.name,
      timestamp: new Date().toISOString(),
      type: 'municipality',
      change: 'created',
      municipalityId: municipality.id,
    });

    return municipality;
  }

  /**
   * Validates the contact details and address and checks that the municipality
   * exists before updating it. Returns the saved record.
   */
  async update(
    id: number,
    data: UpdateMunicipalityDto,
  ): Promise<MunicipalityWithAddress> {
    validateUpdateMunicipality(data);

    const { municipality, changedFields } =
      await this.municipalitiesRepository.update(id, data);

    if (changedFields.length > 0) {
      const employeeNumber =
        process.env.NODE_ENV === 'production'
          ? null
          : process.env.MUNICIPALITY_DEMO_EMPLOYEE_NUMBER?.trim() || null;

      this.logger.log({
        municipalityId: municipality.id,
        employeeNumber,
        employeeNumberSource: employeeNumber ? 'mock' : 'unavailable',
        timestamp: new Date().toISOString(),
        type: 'municipality',
        change: 'updated',
        changedFields,
      });
    }

    return municipality;
  }
}
