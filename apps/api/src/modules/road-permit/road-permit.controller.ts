import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateRoadPermitDto } from './dto/create-road-permit.dto.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import { RoadPermitService } from './road-permit.service.js';

@Controller('road-permit')
export class RoadPermitController {
  /** Receives the road-permit service used by the HTTP handlers. */
  constructor(private readonly roadPermitService: RoadPermitService) {}
  private readonly logger = new Logger(RoadPermitController.name);

  /** Creates a permit from the request body and propagates failures to Nest. */
  @Post()
  async create(@Body() createRoadPermitDto: CreateRoadPermitDto) {
    try {
      const application =
        await this.roadPermitService.create(createRoadPermitDto);
      this.logger.log(`Road permit created ${application.caseNumber}`);
    } catch (error) {
      this.logger.error('Road permit creation failed');
      throw error;
    }
  }

  /** Returns the road-permit listing result from the service. */
  @Get()
  findAll() {
    return this.roadPermitService.findAll();
  }

  /** Passes the numeric route ID to the service and returns its lookup result. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roadPermitService.findOne(+id);
  }

  /** Passes the numeric route ID and submitted changes to the service. */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoadPermitDto: UpdateRoadPermitDto,
  ) {
    return this.roadPermitService.update(+id, updateRoadPermitDto);
  }

  /** Passes the numeric route ID to the service for removal. */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roadPermitService.remove(+id);
  }
}
