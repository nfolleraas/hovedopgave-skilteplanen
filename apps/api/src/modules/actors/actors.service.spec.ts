import {
  ActorRole,
  ApplicationType,
  Availability,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma.service.js';
import { ActorsRepository } from './actors.repository.js';
import { ActorsService } from './actors.service.js';
import type { CreateActorDto } from './dto/create-actor.dto.js';
import { ActorMapper } from './mappers/actor.mapper.js';

describe('ActorsService', () => {
  const create = vi.fn();
  const get = vi.fn();
  const getAll = vi.fn();
  const findApplication = vi.fn();
  let service: ActorsService;

  const dto: CreateActorDto = {
    applicationCaseNumber: 'CASE-123',
    role: ActorRole.Contractor,
    name: ' Eksempel Entreprise ',
    phoneNumber: '12345678',
    email: ' kontakt@eksempel.dk ',
    cvrNumber: '12345678',
    department: ' Byggeri ',
    address: {
      street: ' Testvej ',
      houseNumber: ' 12 ',
      postalCode: ' 5000 ',
      city: ' Odense ',
    },
    contactPerson: {
      name: ' Jane Doe ',
      email: ' jane@example.com ',
      phoneNumber: '87654321',
    },
  };

  beforeEach(() => {
    create.mockReset();
    get.mockReset();
    getAll.mockReset();
    findApplication.mockReset();
    findApplication.mockResolvedValue({ type: ApplicationType.RoadUsePermit });
    service = new ActorsService(
      {
        application: { findUnique: findApplication },
      } as unknown as PrismaService,
      { create, get, getAll } as unknown as ActorsRepository,
      new ActorMapper(),
    );
  });

  it('creates the actor and address in one nested write and returns the saved actor', async () => {
    const saved = {
      uuid: 'actor-id',
      name: 'Eksempel Entreprise',
      address: { uuid: 'address-id', street: 'Testvej' },
    };
    create.mockResolvedValue(saved);

    await expect(service.create(dto)).resolves.toBe(saved);
    expect(findApplication).toHaveBeenCalledWith({
      where: { caseNumber: 'CASE-123' },
      select: { type: true },
    });
    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        role: ActorRole.Contractor,
        name: 'Eksempel Entreprise',
        phoneNumber: '12345678',
        email: 'kontakt@eksempel.dk',
        cvrNumber: '12345678',
        department: 'Byggeri',
        applications: { connect: { caseNumber: 'CASE-123' } },
        contactPersons: {
          create: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            phoneNumber: '87654321',
            availability: Availability.Day,
            application: { connect: { caseNumber: 'CASE-123' } },
          },
        },
        address: {
          create: {
            street: 'Testvej',
            houseNumber: '12',
            postalCode: '5000',
            city: 'Odense',
          },
        },
      },
      include: { address: true, contactPersons: true },
    });
  });

  it('gets an actor through the repository', async () => {
    const actor = { uuid: 'actor-id' };
    get.mockResolvedValue(actor);

    await expect(service.get('actor-id')).resolves.toBe(actor);
    expect(get).toHaveBeenCalledExactlyOnceWith('actor-id');
  });

  it('throws when the repository cannot find an actor', async () => {
    get.mockResolvedValue(null);

    await expect(service.get('missing-id')).rejects.toThrow('Actor not found');
  });

  it('gets all actors through the repository', async () => {
    const actors = [{ uuid: 'actor-id' }];
    getAll.mockResolvedValue(actors);

    await expect(service.getAll()).resolves.toBe(actors);
    expect(getAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('propagates a failed nested write without starting a separate address write', async () => {
    const error = new Error('Database write failed');
    create.mockRejectedValue(error);

    await expect(service.create(dto)).rejects.toBe(error);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('does not write anything when the selected application does not exist', async () => {
    findApplication.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toThrow('Application not found');
    expect(create).not.toHaveBeenCalled();
  });

  it('requires availability for an excavation permit', async () => {
    findApplication.mockResolvedValue({
      type: ApplicationType.ExcavationPermit,
    });

    await expect(service.create(dto)).rejects.toThrow(
      'Contact availability is required',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('defaults a road permit event contact person to daytime availability', async () => {
    findApplication.mockResolvedValue({
      type: ApplicationType.RoadUsePermitEvent,
    });
    create.mockResolvedValue({ uuid: 'event-actor-id' });

    await service.create(dto);

    expect(
      create.mock.calls[0][0].data.contactPersons.create.availability,
    ).toBe(Availability.Day);
  });

  it('uses the selected availability for an excavation permit', async () => {
    findApplication.mockResolvedValue({
      type: ApplicationType.ExcavationPermit,
    });
    create.mockResolvedValue({ uuid: 'excavation-actor-id' });

    await service.create({
      ...dto,
      contactPerson: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phoneNumber: '87654321',
        availability: Availability.Evening,
      },
    });

    expect(
      create.mock.calls[0][0].data.contactPersons.create.availability,
    ).toBe(Availability.Evening);
  });

  it('skips contact person and business fields for a private actor', async () => {
    create.mockResolvedValue({ uuid: 'private-id' });

    await service.create({ ...dto, role: ActorRole.Private });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cvrNumber: null,
        department: null,
        applications: { connect: { caseNumber: 'CASE-123' } },
      }),
      include: { address: true, contactPersons: true },
    });
    expect(create.mock.calls[0][0].data).not.toHaveProperty('contactPersons');
  });
});
