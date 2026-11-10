import {
  Body,
  Controller,
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
import { CreateSignPlanDto } from './dto/create-sign-plan.dto.js';
import { SignPlansService } from './sign-plans.service.js';

@ApiExtraModels(CreateSignPlanDto)
@Controller('sign-plans')
export class SignPlansController {
  constructor(private readonly signPlansService: SignPlansService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateSignPlanDto) },
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
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createSignPlanDto: CreateSignPlanDto,
  ) {
    return this.signPlansService.create(createSignPlanDto, file);
  }

  @Get(':uuid')
  findOne(@Param('uuid') uuid: string) {
    return this.signPlansService.findOne(uuid);
  }
}
