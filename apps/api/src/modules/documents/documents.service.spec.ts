import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType } from '../../generated/prisma/enums.js';
import { R2Service } from '../s3/r2.service.js';
import { DocumentsRepository } from './documents.repository.js';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let repository: {
    add: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let r2Service: {
    upload: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repository = {
      add: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      delete: vi.fn(),
    };
    r2Service = { upload: vi.fn(), delete: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: DocumentsRepository, useValue: repository },
        { provide: R2Service, useValue: r2Service },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([
    ['PDF', 'application/pdf', 'traffic-plan.pdf', 'pdf'],
    ['JPG', 'image/jpeg', 'traffic-plan.jpg', 'jpg'],
    ['JPEG', 'image/jpeg', 'traffic-plan.jpeg', 'jpeg'],
    ['PNG', 'image/png', 'traffic-plan.png', 'png'],
  ])(
    'creates a non-sign-plan %s document with its application relation',
    async (_fileType, mimetype, originalname, extension) => {
      const dto = new CreateDocumentDto();
      dto.name = 'Traffic plan';
      dto.applicationId = 'APP-123';
      const file = {
        buffer: Buffer.from('document'),
        mimetype,
        originalname,
      } as Express.Multer.File;
      repository.add.mockResolvedValue({ uuid: 'document-1' });
      r2Service.upload.mockResolvedValue({});

      await expect(service.create(dto, file)).resolves.toEqual({
        uuid: 'document-1',
      });
      expect(repository.add).toHaveBeenCalledWith({
        name: 'Traffic plan',
        documentType: DocumentType.Other,
        url: expect.stringContaining('/applications/APP-123/documents/'),
        r2ObjectKey: expect.stringMatching(
          new RegExp(`^applications/APP-123/documents/.*\\.${extension}$`),
        ),
        application: { connect: { caseNumber: 'APP-123' } },
      });
      expect(r2Service.upload).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(`^applications/APP-123/documents/.*\\.${extension}$`),
        ),
        file.buffer,
        file.mimetype,
      );
    },
  );

  it.each([
    ['an unsupported file type', 'text/plain', 'notes.txt'],
    ['a mismatched extension', 'image/png', 'traffic-plan.jpg'],
  ])('rejects %s', async (_scenario, mimetype, originalname) => {
    const dto = {
      name: 'Traffic plan',
      applicationId: 'APP-123',
    } as CreateDocumentDto;

    await expect(
      service.create(dto, {
        mimetype,
        originalname,
      } as Express.Multer.File),
    ).rejects.toThrow(
      new BadRequestException('Only PDF, JPG, and PNG files are allowed.'),
    );
    expect(r2Service.upload).not.toHaveBeenCalled();
    expect(repository.add).not.toHaveBeenCalled();
  });

  it('rejects sign plans', async () => {
    const dto = {
      name: 'Sign plan',
      documentType: DocumentType.SignPlan,
      url: 'https://example.com/sign-plan.pdf',
      applicationId: 'APP-123',
    } as CreateDocumentDto;

    await expect(
      service.create(dto, {
        mimetype: 'application/pdf',
        originalname: 'sign-plan.pdf',
      } as Express.Multer.File),
    ).rejects.toThrow(
      new BadRequestException(
        'Sign plans must be created through the sign plans module',
      ),
    );
    expect(repository.add).not.toHaveBeenCalled();
  });

  it('delegates reads, updates, and deletes to the repository', async () => {
    const documents = [{ uuid: 'document-1' }];
    const document = { uuid: 'document-1', r2ObjectKey: 'documents/file.pdf' };
    repository.getAll.mockResolvedValue(documents);
    repository.getById.mockResolvedValue(document);
    repository.delete.mockResolvedValue(document);
    r2Service.delete.mockResolvedValue({});

    await expect(service.findAll()).resolves.toBe(documents);
    await expect(service.findOne('document-1')).resolves.toBe(document);
    await expect(service.remove('document-1')).resolves.toBeUndefined();

    expect(repository.getAll).toHaveBeenCalledOnce();
    expect(repository.getById).toHaveBeenCalledWith('document-1');
    expect(repository.delete).toHaveBeenCalledWith('document-1');
    expect(r2Service.delete).toHaveBeenCalledWith('documents/file.pdf');
  });
});
