import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from '../../generated/prisma/enums.js';
import { DocumentsRepository } from './documents.repository.js';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let repository: {
    add: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      add: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: DocumentsRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a non-sign-plan document with its application relation', async () => {
    const dto = new CreateDocumentDto();
    dto.name = 'Traffic plan';
    dto.url = 'https://example.com/traffic-plan.pdf';
    dto.applicationId = 'APP-123';
    repository.add.mockResolvedValue({ uuid: 'document-1' });

    await expect(service.create(dto)).resolves.toEqual({ uuid: 'document-1' });
    expect(repository.add).toHaveBeenCalledWith({
      name: 'Traffic plan',
      documentType: DocumentType.Other,
      url: 'https://example.com/traffic-plan.pdf',
      application: { connect: { caseNumber: 'APP-123' } },
    });
  });

  it('rejects sign plans', () => {
    const dto = {
      name: 'Sign plan',
      documentType: DocumentType.SignPlan,
      url: 'https://example.com/sign-plan.pdf',
      applicationId: 'APP-123',
    } as CreateDocumentDto;

    expect(() => service.create(dto)).toThrow(
      new BadRequestException(
        'Sign plans must be created through the sign plans module',
      ),
    );
    expect(repository.add).not.toHaveBeenCalled();
  });

  it('delegates reads, updates, and deletes to the repository', async () => {
    const documents = [{ uuid: 'document-1' }];
    const document = { uuid: 'document-1' };
    const update = { name: 'Updated plan' } as UpdateDocumentDto;
    repository.getAll.mockResolvedValue(documents);
    repository.getById.mockResolvedValue(document);
    repository.update.mockResolvedValue(document);
    repository.delete.mockResolvedValue(document);

    await expect(service.findAll()).resolves.toBe(documents);
    await expect(service.findOne('document-1')).resolves.toBe(document);
    await expect(service.update('document-1', update)).resolves.toBe(document);
    await expect(service.remove('document-1')).resolves.toBe(document);

    expect(repository.getAll).toHaveBeenCalledOnce();
    expect(repository.getById).toHaveBeenCalledWith('document-1');
    expect(repository.update).toHaveBeenCalledWith('document-1', {
      name: 'Updated plan',
      url: undefined,
    });
    expect(repository.delete).toHaveBeenCalledWith('document-1');
  });
});
