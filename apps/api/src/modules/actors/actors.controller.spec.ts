import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { ActorRole } from '../../generated/prisma/enums.js';
import { AddressService } from '../address/address.service.js';
import { ActorsController } from './actors.controller.js';
import { ActorsService } from './actors.service.js';
import type { CreateActorDto } from './dto/create-actor.dto.js';
import { UpdateActorDto } from './dto/update-actor.dto.js';

describe('ActorsController', () => {
  let controller: ActorsController;
  const create = vi.fn();
  const findAll = vi.fn();
  const findOne = vi.fn();
  const update = vi.fn();
  const deleteActor = vi.fn();
  const findMatching = vi.fn();

  beforeEach(() => {
    create.mockReset();
    findAll.mockReset();
    findOne.mockReset();
    update.mockReset();
    deleteActor.mockReset();
    findMatching.mockReset();
    findMatching.mockResolvedValue(null);
    controller = new ActorsController(
      {
        create,
        findAll,
        findOne,
        update,
        delete: deleteActor,
      } as unknown as ActorsService,
      { findMatching } as unknown as AddressService,
    );
  });

  it('passes the creation DTO to the service and returns the actor', async () => {
    const dto = Object.assign({} as CreateActorDto, { name: 'Actor' });
    const actor = { uuid: 'actor-id' };
    create.mockResolvedValue(actor);

    await expect(controller.create(dto)).resolves.toBe(actor);
    expect(create).toHaveBeenCalledExactlyOnceWith(dto, undefined);
  });

  it('uses the address service to reuse a matching address when creating an actor', async () => {
    const dto = {
      name: 'Actor',
      address: {
        street: 'Testvej',
        houseNumber: '12',
        postalCode: '5000',
        city: 'Odense',
      },
    } as CreateActorDto;
    findMatching.mockResolvedValue({ uuid: 'existing-address-id' });

    await controller.create(dto);

    expect(findMatching).toHaveBeenCalledExactlyOnceWith(dto.address);
    expect(create).toHaveBeenCalledExactlyOnceWith(dto, 'existing-address-id');
  });

  it('does not create an actor when the address lookup fails', async () => {
    const error = new Error('Address lookup failed');
    findMatching.mockRejectedValue(error);

    await expect(controller.create({} as CreateActorDto)).rejects.toBe(error);
    expect(create).not.toHaveBeenCalled();
  });

  it('reuses a matching address when updating an actor', async () => {
    const dto = {
      address: {
        street: 'Testvej',
        houseNumber: '12',
        postalCode: '5000',
        city: 'Odense',
      },
    };
    findMatching.mockResolvedValue({ uuid: 'existing-address-id' });

    await controller.update('actor-id', dto);

    expect(findMatching).toHaveBeenCalledExactlyOnceWith(dto.address);
    expect(update).toHaveBeenCalledExactlyOnceWith(
      'actor-id',
      dto,
      'existing-address-id',
    );
  });

  it('skips the address lookup when an update has no address', async () => {
    await controller.update('actor-id', { name: 'Actor' });

    expect(findMatching).not.toHaveBeenCalled();
  });

  it('returns all actors from the service', async () => {
    const actors = [{ uuid: 'actor-id' }];
    findAll.mockResolvedValue(actors);

    await expect(controller.getAll()).resolves.toBe(actors);
    expect(findAll).toHaveBeenCalledExactlyOnceWith();
  });

  it('returns an empty list when there are no actors', async () => {
    findAll.mockResolvedValue([]);

    await expect(controller.getAll()).resolves.toEqual([]);
  });

  it('passes the uuid to the service and returns the actor', async () => {
    const actor = { uuid: 'actor-id' };
    findOne.mockResolvedValue(actor);

    await expect(controller.get('actor-id')).resolves.toBe(actor);
    expect(findOne).toHaveBeenCalledExactlyOnceWith('actor-id');
  });

  it('propagates the not-found exception when getting a missing actor', async () => {
    const error = new NotFoundException('Actor not found');
    findOne.mockRejectedValue(error);

    await expect(controller.get('missing-id')).rejects.toBe(error);
  });

  it('propagates service creation errors', async () => {
    const error = new NotFoundException('Application not found');
    create.mockRejectedValue(error);

    await expect(controller.create({} as CreateActorDto)).rejects.toBe(error);
  });

  it('propagates service update errors', async () => {
    const error = new Error('Update failed');
    update.mockRejectedValue(error);

    await expect(controller.update('actor-id', { name: 'Actor' })).rejects.toBe(
      error,
    );
  });

  it('passes the uuid to the delete service and returns the deleted actor', async () => {
    const actor = { uuid: 'actor-id', name: 'Deleted Actor' };
    deleteActor.mockResolvedValue(actor);

    await expect(controller.delete('actor-id')).resolves.toBe(actor);
    expect(deleteActor).toHaveBeenCalledExactlyOnceWith('actor-id');
  });

  it('propagates the not-found exception when deleting a missing actor', async () => {
    const error = new NotFoundException('Actor not found');
    deleteActor.mockRejectedValue(error);

    await expect(controller.delete('missing-id')).rejects.toBe(error);
  });

  it('passes the uuid and partial update to the service and returns the actor', async () => {
    const dto = { contactPerson: { email: 'new@example.com' } };
    const actor = { uuid: 'actor-id', contactPersons: [dto.contactPerson] };
    update.mockResolvedValue(actor);

    await expect(controller.update('actor-id', dto)).resolves.toBe(actor);
    expect(update).toHaveBeenCalledExactlyOnceWith('actor-id', dto, undefined);
  });

  it('accepts supported update fields through the global validation settings', async () => {
    const pipe = new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    });
    const metadata = { type: 'body' as const, metatype: UpdateActorDto };
    const dto = {
      name: 'Updated Actor',
      contactPerson: { email: 'new@example.com' },
    };

    await expect(pipe.transform(dto, metadata)).resolves.toMatchObject(dto);
    await expect(
      pipe.transform({ uuid: 'unexpected-id' }, metadata),
    ).rejects.toThrow();
  });

  it.each(Object.values(ActorRole))(
    'rejects role %s in update payloads through validation',
    async (role) => {
      const pipe = new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      });

      await expect(
        pipe.transform(
          { role, name: 'Updated Actor' },
          { type: 'body', metatype: UpdateActorDto },
        ),
      ).rejects.toThrow('Bad Request Exception');
    },
  );
});
