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
} from '@nestjs/common';
import { ContactPersonsService } from './contact-persons.service.js';
import { CreateContactPersonDto } from './dto/create-contact-person.dto.js';
import { UpdateContactPersonDto } from './dto/update-contact-person.dto.js';

@Controller('contact-persons')
export class ContactPersonsController {
  constructor(private readonly contactPersonsService: ContactPersonsService) {}

  @Post()
  create(@Body() createContactPersonDto: CreateContactPersonDto) {
    return this.contactPersonsService.create(createContactPersonDto);
  }

  @Get()
  findByApplication(@Query('applicationId') applicationId: string) {
    return this.contactPersonsService.findByApplication(applicationId);
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
