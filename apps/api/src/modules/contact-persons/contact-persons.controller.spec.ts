import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { dtoValidationPipe } from '../../common/dto-validation.pipe.js';
import { ContactPersonsController } from './contact-persons.controller.js';
import { ContactPersonsService } from './contact-persons.service.js';
import { CreateContactPersonDto } from './dto/create-contact-person.dto.js';
import { FindContactPersonsQueryDto } from './dto/find-contact-persons-query.dto.js';
import { UpdateContactPersonDto } from './dto/update-contact-person.dto.js';

const applicationId = '3f2b8c1e-9d4a-4b7e-8a61-2c5d0e9f7a13';
const contactPersonId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

describe('ContactPersonsController', () => {
  const service = {
    create: vi.fn(),
    findByApplication: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  let controller: ContactPersonsController;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [ContactPersonsController],
      providers: [{ provide: ContactPersonsService, useValue: service }],
    }).compile();

    controller = module.get(ContactPersonsController);
  });

  it('creates a contact person and returns the service result', async () => {
    const dto = new CreateContactPersonDto();
    const contactPerson = { uuid: contactPersonId };
    service.create.mockResolvedValue(contactPerson);

    await expect(controller.create(dto)).resolves.toBe(contactPerson);
    expect(service.create).toHaveBeenCalledExactlyOnceWith(dto);
  });

  it('lists the contact persons of the application in the query', async () => {
    const contactPersons = [{ uuid: contactPersonId }];
    service.findByApplication.mockResolvedValue(contactPersons);

    await expect(controller.findByApplication({ applicationId })).resolves.toBe(
      contactPersons,
    );
    expect(service.findByApplication).toHaveBeenCalledExactlyOnceWith(
      applicationId,
    );
  });

  it('returns one contact person by id', async () => {
    const contactPerson = { uuid: contactPersonId };
    service.findOne.mockResolvedValue(contactPerson);

    await expect(controller.findOne(contactPersonId)).resolves.toBe(
      contactPerson,
    );
    expect(service.findOne).toHaveBeenCalledExactlyOnceWith(contactPersonId);
  });

  it('updates the contact person with the given id', async () => {
    const dto = new UpdateContactPersonDto();
    const contactPerson = { uuid: contactPersonId };
    service.update.mockResolvedValue(contactPerson);

    await expect(controller.update(contactPersonId, dto)).resolves.toBe(
      contactPerson,
    );
    expect(service.update).toHaveBeenCalledExactlyOnceWith(
      contactPersonId,
      dto,
    );
  });

  it('removes the contact person with the given id', async () => {
    service.remove.mockResolvedValue(undefined);

    await expect(controller.remove(contactPersonId)).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledExactlyOnceWith(contactPersonId);
  });

  it('propagates service failures to Nest', async () => {
    const error = new Error('Not found');
    service.findOne.mockRejectedValue(error);

    await expect(controller.findOne(contactPersonId)).rejects.toBe(error);
  });
});

describe('FindContactPersonsQueryDto', () => {
  // The same pipe the controller uses through @UsePipes.
  const pipe = dtoValidationPipe();
  const validate = (value: unknown) =>
    pipe.transform(value, {
      type: 'query',
      metatype: FindContactPersonsQueryDto,
    });

  it('accepts a UUID application id', async () => {
    await expect(validate({ applicationId })).resolves.toEqual({
      applicationId,
    });
  });

  it.each([
    ['missing', {}],
    ['empty', { applicationId: '' }],
    ['not a UUID', { applicationId: 'DEV-GRAVE-1' }],
  ])('rejects an application id that is %s', async (_, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown query parameters', async () => {
    await expect(
      validate({ applicationId, extra: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
