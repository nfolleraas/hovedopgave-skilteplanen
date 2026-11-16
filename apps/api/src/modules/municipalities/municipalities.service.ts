import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMunicipalityDto } from './dto/create-municipality.dto.js';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto.js';
import { MunicipalitiesRepository } from './municipalities.repository.js';
import {
  validateCreateMunicipality,
  validateUpdateMunicipality,
} from './municipalities.validator.js';

@Injectable()
export class MunicipalitiesService {
  constructor(
    private readonly municipalitiesRepository: MunicipalitiesRepository,
  ) {}

  async findById(id: number) {
    const municipality = await this.municipalitiesRepository.findById(id);

    if (!municipality) {
      throw new NotFoundException('Kommunen blev ikke fundet');
    }

    return municipality;
  }

  async create(data: CreateMunicipalityDto) {
    validateCreateMunicipality(data);

    return this.municipalitiesRepository.create(data);
  }

  async update(id: number, data: UpdateMunicipalityDto) {
    validateUpdateMunicipality(data);

    await this.findById(id);

    return this.municipalitiesRepository.update(id, data);
  }
}
