import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';

@ApiExtraModels(CreateDocumentDto)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateDocumentDto) },
        {
          type: 'object',
          required: ['file'],
          properties: {
            file: {
              type: 'string',
              format: 'binary',
            },
          },
        },
      ],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    return await this.documentsService.create(createDocumentDto, file);
  }

  @Get()
  async findAll() {
    return await this.documentsService.findAll();
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    return await this.documentsService.findOne(uuid);
  }

  @Delete(':uuid')
  async remove(@Param('uuid') uuid: string) {
    return await this.documentsService.remove(uuid);
  }
}
