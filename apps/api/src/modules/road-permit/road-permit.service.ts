import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CreateRoadPermitDto } from './dto/create-road-permit.dto.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import { mapCreateRoadPermit } from './mappers/road-permit.mapper.js';
import { RoadPermitRepository } from './road-permit.repository.js';

@Injectable()
export class RoadPermitService {
  constructor(private readonly roadPermitRepository: RoadPermitRepository) {}

  async create(createRoadPermitDto: CreateRoadPermitDto) {
    const data = mapCreateRoadPermit(createRoadPermitDto, randomUUID());
    return this.roadPermitRepository.create(data);
  }

  findAll() {
    return this.roadPermitRepository.findAll();
  }

  findOne(id: number) {
    return this.roadPermitRepository.findOne(id);
  }

  update(id: number, updateRoadPermitDto: UpdateRoadPermitDto) {
    return this.roadPermitRepository.update(id, updateRoadPermitDto);
  }

  remove(id: number) {
    return this.roadPermitRepository.remove(id);
  }
}
