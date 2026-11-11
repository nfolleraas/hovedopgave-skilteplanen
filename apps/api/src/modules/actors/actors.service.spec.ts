import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActorRole, ApplicationType } from '../../generated/prisma/enums.js';
import { ApplicationsRepository } from '../applications/applications.repository.js';
import { ActorsRepository } from './actors.repository.js';
import { ActorsService } from './actors.service.js';
import type { CreateActorDto } from './dto/create-actor.dto.js';
import { ActorMapper } from './mappers/actor.mapper.js';

describe('ActorsService', () => {
  const create = vi.fn();
  const update = vi.fn();
  const deleteActor = vi.fn();
  const get = vi.fn();
  const getAll = vi.fn();
  const findApplication = vi.fn();
  let service: ActorsService;

  const dto = {
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
  } satisfies CreateActorDto;

  beforeEach(() => {
    create.mockReset();
    update.mockReset();
    deleteActor.mockReset();
    get.mockReset();
    get.mockResolvedValue({
      uuid: 'actor-id',
      role: ActorRole.Contractor,
      contactPersons: [{ applicationId: 'CASE-123' }],
    });
    getAll.mockReset();
    findApplication.mockReset();
    findApplication.mockResolvedValue({ type: ApplicationType.RoadUsePermit });
    service = new ActorsService(
      { get: findApplication } as unknown as ApplicationsRepository,
      {
        create,
        update,
        delete: deleteActor,
        get,
        getAll,
      } as unknown as ActorsRepository,
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
    expect(findApplication).toHaveBeenCalledExactlyOnceWith('CASE-123');
    expect(create).toHaveBeenCalledExactlyOnceWith({
      role: ActorRole.Contractor,
      name: 'Eksempel Entreprise',
      phoneNumber: '12345678',
      email: 'kontakt@eksempel.dk',
      cvrNumber: '12345678',
      department: 'Byggeri',
      applications: { connect: { caseNumber: 'CASE-123' } },
      address: {
        create: {
          street: 'Testvej',
          houseNumber: '12',
          postalCode: '5000',
          city: 'Odense',
        },
      },
    });
  });

  it('deletes an actor by uuid through the repository and returns the deleted actor', async () => {
    const actor = { uuid: 'actor-id', name: 'Deleted Actor' };
    deleteActor.mockResolvedValue(actor);

    await expect(service.delete('actor-id')).resolves.toBe(actor);
    expect(deleteActor).toHaveBeenCalledExactlyOnceWith('actor-id');
  });

  it('connects the existing address passed by the controller when creating an actor', async () => {
    await service.create(dto, 'existing-address-id');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        address: { connect: { uuid: 'existing-address-id' } },
      }),
    );
  });

  it('connects the existing address passed by the controller when updating an actor', async () => {
    await service.update(
      'actor-id',
      { address: dto.address },
      'existing-address-id',
    );

    expect(update).toHaveBeenCalledExactlyOnceWith('actor-id', {
      address: { connect: { uuid: 'existing-address-id' } },
    });
  });

  it('returns a not-found exception when deleting a missing actor', async () => {
    deleteActor.mockResolvedValue(null);

    await expect(service.delete('missing-id')).rejects.toThrow(
      new NotFoundException('Actor not found'),
    );
  });

  it('propagates unexpected deletion errors', async () => {
    const error = new Error('Database unavailable');
    deleteActor.mockRejectedValue(error);

    await expect(service.delete('actor-id')).rejects.toBe(error);
  });

  it('gets an actor through the repository', async () => {
    const actor = { uuid: 'actor-id' };
    get.mockResolvedValue(actor);

    await expect(service.findOne('actor-id')).resolves.toBe(actor);
    expect(get).toHaveBeenCalledExactlyOnceWith('actor-id');
  });

  it('updates an actor through the repository by uuid', async () => {
    const saved = { uuid: 'actor-id', name: 'Updated Actor' };
    const updateDto = {
      name: ' Updated Actor ',
      address: {
        street: ' New street ',
        houseNumber: ' 2 ',
        postalCode: ' 8000 ',
        city: ' Aarhus ',
      },
    };
    update.mockResolvedValue(saved);

    await expect(service.update('actor-id', updateDto)).resolves.toBe(saved);
    expect(update).toHaveBeenCalledExactlyOnceWith('actor-id', {
      name: 'Updated Actor',
      address: {
        create: {
          street: 'New street',
          houseNumber: '2',
          postalCode: '8000',
          city: 'Aarhus',
        },
      },
    });
  });

  it('throws when the repository cannot find an actor', async () => {
    get.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(
      'Actor not found',
    );
  });

  it('gets all actors through the repository', async () => {
    const actors = [{ uuid: 'actor-id' }];
    getAll.mockResolvedValue(actors);

    await expect(service.findAll()).resolves.toBe(actors);
    expect(getAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('propagates a failed repository create', async () => {
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

  it('skips contact person and business fields for a private actor', async () => {
    create.mockResolvedValue({ uuid: 'private-id' });

    await service.create({
      ...dto,
      role: ActorRole.Private,
      contactPerson: undefined,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        cvrNumber: null,
        department: null,
        applications: { connect: { caseNumber: 'CASE-123' } },
      }),
    );
    expect(create.mock.calls[0][0]).not.toHaveProperty('contactPersons');
  });

  describe.each(Object.values(ApplicationType))(
    '%s actors without contact persons',
    (type) => {
      it.each(Object.values(ActorRole))(
        'creates a %s actor before contact details are added separately',
        async (role) => {
          findApplication.mockResolvedValue({ type });
          const saved = { uuid: 'actor-id', role, contactPersons: [] };
          create.mockResolvedValue(saved);

          await expect(
            service.create({ ...dto, role, contactPerson: undefined }),
          ).resolves.toBe(saved);
          expect(create).toHaveBeenCalledTimes(1);
          expect(create.mock.calls[0][0]).not.toHaveProperty('contactPersons');
        },
      );
    },
  );

  it('allows private actors without a contact person for excavation permits', async () => {
    findApplication.mockResolvedValue({
      type: ApplicationType.ExcavationPermit,
    });
    const actor = { uuid: 'private-id' };
    create.mockResolvedValue(actor);

    await expect(
      service.create({
        ...dto,
        role: ActorRole.Private,
        contactPerson: undefined,
      }),
    ).resolves.toBe(actor);
    expect(create.mock.calls[0][0]).not.toHaveProperty('contactPersons');
  });

  it('propagates application lookup failures without writing an actor', async () => {
    const error = new Error('Database unavailable');
    findApplication.mockRejectedValue(error);

    await expect(service.create(dto)).rejects.toBe(error);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns an empty actor list', async () => {
    getAll.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
  });

  it('supports finding all actors through the repository', async () => {
    const actors = [{ uuid: 'actor-id' }];
    getAll.mockResolvedValue(actors);

    await expect(service.findAll()).resolves.toBe(actors);
    expect(getAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('supports finding one actor through the repository', async () => {
    const actor = { uuid: 'actor-id' };
    get.mockResolvedValue(actor);

    await expect(service.findOne('actor-id')).resolves.toBe(actor);
    expect(get).toHaveBeenCalledExactlyOnceWith('actor-id');
  });

  it('rejects a missing actor through findOne', async () => {
    get.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(
      new NotFoundException('Actor not found'),
    );
  });

  it('propagates repository update failures', async () => {
    const error = new Error('Update failed');
    update.mockRejectedValue(error);

    await expect(service.update('actor-id', { name: 'Updated' })).rejects.toBe(
      error,
    );
  });

  it('rejects contact details when changing an actor to private', async () => {
    const input = {
      role: ActorRole.Private,
      contactPerson: { email: 'new@example.com' },
    };
    await expect(service.update('actor-id', input)).rejects.toThrow(
      new BadRequestException('Actor role can only be set during creation'),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it.each(Object.values(ActorRole))(
    'rejects role %s in updates, including the current role',
    async (role) => {
      const input = { role, name: 'Updated Actor' };

      await expect(service.update('actor-id', input)).rejects.toThrow(
        new BadRequestException('Actor role can only be set during creation'),
      );
      expect(update).not.toHaveBeenCalled();
      expect(get).not.toHaveBeenCalled();
    },
  );
});
