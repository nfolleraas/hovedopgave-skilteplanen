import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.create(createDocumentDto);
  }

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.documentsService.findOne(uuid);
  }

  @Patch(':uuid')
  update(@Param('uuid') uuid: string, @Body() updateDocumentDto: UpdateDocumentDto) {
    return this.documentsService.update(uuid, updateDocumentDto);
  }

  @Delete(':uuid')
  remove(@Param('uuid') uuid: string) {
    return this.documentsService.remove(uuid);
  }
}
