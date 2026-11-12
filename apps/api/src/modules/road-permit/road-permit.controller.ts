import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateRoadPermitDto } from './dto/create-road-permit.dto.js';
import { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import { RoadPermitService } from './road-permit.service.js';
import { Logger } from '@nestjs/common';

@Controller('road-permit')
export class RoadPermitController {
  constructor(private readonly roadPermitService: RoadPermitService) {}


  private readonly logger = new Logger(RoadPermitController.name)
 
  
  @Post()
  async create(@Body() createRoadPermitDto: CreateRoadPermitDto) {
    try{
      const application = await this.roadPermitService.create(createRoadPermitDto);
      this.logger.log(`Road permit created ${application.caseNumber}`)
    }
    catch{
      this.logger.log(`Road permit creation error failed for`)
    }
  }

  @Get()
  findAll() {
    return this.roadPermitService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roadPermitService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoadPermitDto: UpdateRoadPermitDto,
  ) {
    return this.roadPermitService.update(+id, updateRoadPermitDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roadPermitService.remove(+id);
  }
}
