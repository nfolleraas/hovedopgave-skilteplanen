import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from '../../generated/prisma/enums.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [{ provide: DocumentsService, useValue: service }],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a document through the service', () => {
    const dto = {
      name: 'Traffic plan',
      documentType: DocumentType.Other,
      url: 'https://example.com/traffic-plan.pdf',
      applicationId: 'APP-123',
    } as CreateDocumentDto;
    const file = { originalname: 'traffic-plan.pdf' } as Express.Multer.File;
    const result = { uuid: 'document-1' };
    service.create.mockReturnValue(result);

    expect(controller.create(file, dto)).toBe(result);
    expect(service.create).toHaveBeenCalledWith(dto, file);
  });

  it('returns all documents from the service', () => {
    const result = [{ uuid: 'document-1' }];
    service.findAll.mockReturnValue(result);

    expect(controller.findAll()).toBe(result);
    expect(service.findAll).toHaveBeenCalledOnce();
  });

  it('returns one document from the service', () => {
    const result = { uuid: 'document-1' };
    service.findOne.mockReturnValue(result);

    expect(controller.findOne('document-1')).toBe(result);
    expect(service.findOne).toHaveBeenCalledWith('document-1');
  });

  it('removes a document through the service', () => {
    const result = { uuid: 'document-1' };
    service.remove.mockReturnValue(result);

    expect(controller.remove('document-1')).toBe(result);
    expect(service.remove).toHaveBeenCalledWith('document-1');
  });
});
