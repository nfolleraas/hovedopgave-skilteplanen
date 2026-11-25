import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ContactPersonService } from './contact-person.service.js';
import { CreateContactPersonDto } from './dto/create-contact-person.dto.js';
import { UpdateContactPersonDto } from './dto/update-contact-person.dto.js';

@Controller('contact-person')
export class ContactPersonController {
  constructor(private readonly contactPersonService: ContactPersonService) {}

  @Post()
  create(@Body() createContactPersonDto: CreateContactPersonDto): string {
    return this.contactPersonService.create(createContactPersonDto);
  }

  @Get()
  findAll(): string {
    return this.contactPersonService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): string {
    return this.contactPersonService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContactPersonDto: UpdateContactPersonDto,
  ): string {
    return this.contactPersonService.update(+id, updateContactPersonDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): string {
    return this.contactPersonService.remove(+id);
  }
}
