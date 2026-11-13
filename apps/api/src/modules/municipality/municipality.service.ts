import { Injectable } from '@nestjs/common';
import { MunicipalityRepository } from './municipality.repository.js';

@Injectable()
export class MunicipalityService {
  constructor(private readonly municipalities: MunicipalityRepository) {}

  /** Orders the choices according to the Danish alphabet. */
  async findAll() {
    const municipalities = await this.municipalities.findAll();
    return municipalities.sort((a, b) => a.name.localeCompare(b.name, 'da'));
  }
}
