import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ActorRole,
  ApplicationType,
  Availability,
} from '../../generated/prisma/enums.js';
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
    });
  });

  it('deletes an actor by uuid through the repository and returns the deleted actor', async () => {
    const actor = { uuid: 'actor-id', name: 'Deleted Actor' };
    deleteActor.mockResolvedValue(actor);

    await expect(service.delete('actor-id')).resolves.toBe(actor);
    expect(deleteActor).toHaveBeenCalledExactlyOnceWith('actor-id');
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
        update: {
          street: 'New street',
          houseNumber: '2',
          postalCode: '8000',
          city: 'Aarhus',
        },
      },
    });
  });

  it('updates the related contact person through the repository', async () => {
    findApplication.mockResolvedValue({
      type: ApplicationType.ExcavationPermit,
    });
    await service.update('actor-id', {
      contactPerson: {
        name: ' Jane Doe ',
        email: ' jane@example.com ',
        phoneNumber: '87654321',
        availability: Availability.Evening,
      },
    });

    expect(update).toHaveBeenCalledExactlyOnceWith('actor-id', {
      contactPersons: {
        update: {
          where: { actorId: 'actor-id' },
          data: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            phoneNumber: '87654321',
            availability: Availability.Evening,
          },
        },
      },
    });
  });

  it('leaves omitted contact person fields unchanged', async () => {
    await service.update('actor-id', {
      contactPerson: { email: ' new@example.com ' },
    });

    expect(update).toHaveBeenCalledExactlyOnceWith('actor-id', {
      contactPersons: {
        update: {
          where: { actorId: 'actor-id' },
          data: { email: 'new@example.com', availability: Availability.Day },
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

    expect(create.mock.calls[0][0].contactPersons.create.availability).toBe(
      Availability.Day,
    );
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

    expect(create.mock.calls[0][0].contactPersons.create.availability).toBe(
      Availability.Evening,
    );
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

  describe.each([
    ApplicationType.RoadUsePermit,
    ApplicationType.RoadUsePermitEvent,
  ])('%s contact availability', (type) => {
    it.each([undefined, ...Object.values(Availability)])(
      'always saves Day on creation when availability is %s',
      async (availability) => {
        findApplication.mockResolvedValue({ type });
        const contactPerson = { ...dto.contactPerson, availability };

        await service.create({ ...dto, contactPerson });

        expect(create.mock.calls[0][0].contactPersons.create.availability).toBe(
          Availability.Day,
        );
        expect(contactPerson.availability).toBe(availability);
      },
    );

    it.each([undefined, ...Object.values(Availability)])(
      'always saves Day on contact updates when availability is %s',
      async (availability) => {
        findApplication.mockResolvedValue({ type });
        const contactPerson = { email: 'new@example.com', availability };

        await service.update('actor-id', { contactPerson });

        expect(findApplication).toHaveBeenCalledExactlyOnceWith('CASE-123');
        expect(update.mock.calls[0][1].contactPersons.update.data).toEqual({
          email: 'new@example.com',
          availability: Availability.Day,
        });
        expect(contactPerson.availability).toBe(availability);
      },
    );
  });

  it.each(Object.values(Availability))(
    'preserves excavation availability %s on creation and updates',
    async (availability) => {
      findApplication.mockResolvedValue({
        type: ApplicationType.ExcavationPermit,
      });

      await service.create({
        ...dto,
        contactPerson: { ...dto.contactPerson, availability },
      });
      await service.update('actor-id', { contactPerson: { availability } });

      expect(create.mock.calls[0][0].contactPersons.create.availability).toBe(
        availability,
      );
      expect(update.mock.calls[0][1].contactPersons.update.data).toEqual({
        availability,
      });
    },
  );

  it('leaves excavation availability unchanged when omitted from a partial update', async () => {
    findApplication.mockResolvedValue({
      type: ApplicationType.ExcavationPermit,
    });

    await service.update('actor-id', {
      contactPerson: { email: 'new@example.com' },
    });

    expect(update.mock.calls[0][1].contactPersons.update.data).toEqual({
      email: 'new@example.com',
    });
  });

  it.each(Object.values(ApplicationType))(
    'rejects contact persons on private actors for %s',
    async (type) => {
      findApplication.mockResolvedValue({ type });

      await expect(
        service.create({ ...dto, role: ActorRole.Private }),
      ).rejects.toThrow(
        new BadRequestException('Private actors cannot have contact persons'),
      );
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('rejects contact updates on existing private actors when role is omitted', async () => {
    get.mockResolvedValue({ role: ActorRole.Private, contactPersons: [] });

    await expect(
      service.update('actor-id', {
        contactPerson: { email: 'new@example.com' },
      }),
    ).rejects.toThrow(
      new BadRequestException('Private actors cannot have contact persons'),
    );
    expect(update).not.toHaveBeenCalled();
    expect(findApplication).not.toHaveBeenCalled();
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

  it('rejects contact updates for a missing actor', async () => {
    get.mockResolvedValue(null);

    await expect(
      service.update('missing-id', { contactPerson: {} }),
    ).rejects.toThrow(new NotFoundException('Actor not found'));
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects updates when the contact person does not exist', async () => {
    get.mockResolvedValue({ role: ActorRole.Contractor, contactPersons: [] });

    await expect(
      service.update('actor-id', { contactPerson: {} }),
    ).rejects.toThrow(new NotFoundException('Contact person not found'));
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects contact updates when the linked application does not exist', async () => {
    findApplication.mockResolvedValue(null);

    await expect(
      service.update('actor-id', { contactPerson: {} }),
    ).rejects.toThrow(new NotFoundException('Application not found'));
    expect(update).not.toHaveBeenCalled();
  });
});
