import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../generated/prisma/client.js';
import { DocumentType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentsRepository } from './documents.repository.js';

describe('DocumentsRepository', () => {
  let repository: DocumentsRepository;
  let prisma: {
    document: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      document: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get<DocumentsRepository>(DocumentsRepository);
  });

  it('creates a document', async () => {
    const data: Prisma.DocumentCreateInput = {
      name: 'Traffic plan',
      documentType: DocumentType.Other,
      url: 'https://example.com/traffic-plan.pdf',
      application: { connect: { caseNumber: 'APP-123' } },
    };
    const result = { uuid: 'document-1' };
    prisma.document.create.mockResolvedValue(result);

    await expect(repository.add(data)).resolves.toBe(result);
    expect(prisma.document.create).toHaveBeenCalledWith({ data });
  });

  it('gets all documents', async () => {
    const result = [{ uuid: 'document-1' }];
    prisma.document.findMany.mockResolvedValue(result);

    await expect(repository.getAll()).resolves.toBe(result);
    expect(prisma.document.findMany).toHaveBeenCalledWith();
  });

  it('gets a document by uuid', async () => {
    const result = { uuid: 'document-1' };
    prisma.document.findUniqueOrThrow.mockResolvedValue(result);

    await expect(repository.getById('document-1')).resolves.toBe(result);
    expect(prisma.document.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { uuid: 'document-1' },
    });
  });

  it('updates a document by uuid', async () => {
    const data = { name: 'Updated plan' };
    const result = { uuid: 'document-1' };
    prisma.document.update.mockResolvedValue(result);

    await expect(repository.update('document-1', data)).resolves.toBe(result);
    expect(prisma.document.update).toHaveBeenCalledWith({
      where: { uuid: 'document-1' },
      data,
    });
  });

  it('deletes a document by uuid', async () => {
    const result = { uuid: 'document-1' };
    prisma.document.delete.mockResolvedValue(result);

    await expect(repository.delete('document-1')).resolves.toBe(result);
    expect(prisma.document.delete).toHaveBeenCalledWith({
      where: { uuid: 'document-1' },
    });
  });
});
