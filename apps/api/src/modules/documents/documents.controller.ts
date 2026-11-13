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

  /**
   * Accepts an uploaded document and creates its metadata record.
   * @param file - The uploaded document file
   * @param createDocumentDto - The document metadata supplied by the client
   * @returns The newly created document
   */
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

  /**
   * Lists all stored documents.
   * @returns The stored documents
   */
  @Get()
  async findAll() {
    return await this.documentsService.findAll();
  }

  /**
   * Retrieves a document by its unique identifier.
   * @param uuid - The document identifier
   * @returns The matching document
   */
  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    return await this.documentsService.findOne(uuid);
  }

  /**
   * Removes a document and its associated object from storage.
   * @param uuid - The document identifier
   * @returns A promise that resolves when the document has been removed
   */
  @Delete(':uuid')
  async remove(@Param('uuid') uuid: string) {
    return await this.documentsService.remove(uuid);
  }
}
