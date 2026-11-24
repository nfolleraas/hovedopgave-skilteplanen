import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { dtoValidationPipe } from '../../common/dto-validation.pipe.js';
import { ContactPersonsService } from './contact-persons.service.js';
import { CreateContactPersonDto } from './dto/create-contact-person.dto.js';
import { FindContactPersonsQueryDto } from './dto/find-contact-persons-query.dto.js';
import { UpdateContactPersonDto } from './dto/update-contact-person.dto.js';

@Controller('contact-persons')
@UsePipes(dtoValidationPipe())
export class ContactPersonsController {
  constructor(private readonly contactPersonsService: ContactPersonsService) {}

  @Post()
  create(@Body() createContactPersonDto: CreateContactPersonDto) {
    return this.contactPersonsService.create(createContactPersonDto);
  }

  @Get()
  findByApplication(@Query() query: FindContactPersonsQueryDto) {
    return this.contactPersonsService.findByApplication(query.applicationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactPersonsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContactPersonDto: UpdateContactPersonDto,
  ) {
    return this.contactPersonsService.update(id, updateContactPersonDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.contactPersonsService.remove(id);
  }
}
