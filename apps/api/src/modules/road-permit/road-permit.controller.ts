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
import { MaterialType } from '../../generated/prisma/enums.js';
import { RoadPermitService } from './road-permit.service.js';
import { roadPermitTrafficChanges } from './road-permit-options.js';

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

  /** Passes the untrusted body to the service's submission parser. */
  @Post(':id/submit')
  async submit(@Param('id') id: string, @Body() dto: unknown) {
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

  /** Lists the material types accepted by the Prisma schema. */
  @Get('material-types')
  getMaterialTypes() {
    return Object.values(MaterialType);
  }

  /** Lists the traffic changes available in the road-permit form. */
  @Get('traffic-changes')
  getTrafficChanges() {
    return roadPermitTrafficChanges;
  }

  /** Loads a road-permit draft by its case number. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roadPermitService.findOne(id);
  }

  /** Passes the untrusted snapshot to the service's draft parser. */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoadPermitDto: unknown) {
    return this.roadPermitService.update(id, updateRoadPermitDto);
  }

  /** Passes the numeric route ID to the service for removal. */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roadPermitService.remove(+id);
  }
}
