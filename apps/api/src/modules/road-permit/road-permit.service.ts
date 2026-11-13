import { Injectable } from '@nestjs/common';
import { CreateRoadPermitDto } from './dto/create-road-permit.dto.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import { mapCreateRoadPermit } from './mappers/road-permit.mapper.js';
import { RoadPermitRepository } from './road-permit.repository.js';

@Injectable()
export class RoadPermitService {
  /** Receives the repository used for road-permit operations. */
  constructor(private readonly roadPermitRepository: RoadPermitRepository) {}

  /** Maps the submitted application to persistence data and returns the saved permit. */
  async create(createRoadPermitDto: CreateRoadPermitDto) {
    const data = mapCreateRoadPermit(createRoadPermitDto);
    return this.roadPermitRepository.create(data);
  }

  /** Returns the repository's road-permit listing result. */
  findAll() {
    return this.roadPermitRepository.findAll();
  }

  /** Passes the numeric permit ID to the repository for lookup. */
  findOne(id: number) {
    return this.roadPermitRepository.findOne(id);
  }

  /** Forwards the permit ID and requested changes to the repository. */
  update(id: number, updateRoadPermitDto: UpdateRoadPermitDto) {
    return this.roadPermitRepository.update(id, updateRoadPermitDto);
  }

  /** Passes the numeric permit ID to the repository for removal. */
  remove(id: number) {
    return this.roadPermitRepository.remove(id);
  }
}
