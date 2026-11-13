import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
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

  /** Creates a blank draft and returns its case number. */
  @Post()
  create() {
    return this.roadPermitService.create();
  }

  /** Submits the existing draft and propagates failures to Nest. */
  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() dto: CreateRoadPermitDto) {
    try {
      const application = await this.roadPermitService.submit(id, dto);
      this.logger.log(`Road permit submitted ${application.caseNumber}`);
      return application;
    } catch (error) {
      this.logger.error('Road permit submission failed');
      throw error;
    }
  }

  /** Lists drafts in development while application ownership is unavailable. */
  @Get('drafts')
  findAll() {
    if (process.env.NODE_ENV !== 'development') throw new NotFoundException();
    return this.roadPermitService.findAll();
  }

  /** Loads a road-permit draft by its case number. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roadPermitService.findOne(id);
  }

  /** Saves the current form snapshot to the existing draft. */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoadPermitDto: UpdateRoadPermitDto,
  ) {
    return this.roadPermitService.update(id, updateRoadPermitDto);
  }

  /** Passes the numeric route ID to the service for removal. */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roadPermitService.remove(+id);
  }
}
