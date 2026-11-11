import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ActorsRepository } from './actors.repository.js';

describe('ActorsRepository', () => {
  const create = vi.fn();
  const update = vi.fn();
  const findUnique = vi.fn();
  const findMany = vi.fn();
  const deleteActor = vi.fn();
  const deleteContactPersons = vi.fn();
  const transaction = vi.fn();
  let repository: ActorsRepository;

  beforeEach(() => {
    create.mockReset();
    update.mockReset();
    findUnique.mockReset();
    findMany.mockReset();
    deleteActor.mockReset();
    deleteContactPersons.mockReset();
    transaction.mockReset();
    transaction.mockImplementation((callback) =>
      callback({
        actor: { delete: deleteActor },
        contactPerson: { deleteMany: deleteContactPersons },
      }),
    );
    repository = new ActorsRepository({
      actor: { create, update, findUnique, findMany },
      $transaction: transaction,
    } as unknown as PrismaService);
  });

  it('creates an actor with its related address and contact persons', async () => {
    const data = { name: 'Actor' } as never;
    const savedActor = { uuid: 'actor-id' };
    create.mockResolvedValue(savedActor);

    await expect(repository.create(data)).resolves.toBe(savedActor);
    expect(create).toHaveBeenCalledExactlyOnceWith({
      data,
      include: { address: true, contactPersons: true },
    });
  });

  it('updates an actor with its related address and contact persons', async () => {
    const data = {
      name: 'Updated Actor',
      contactPersons: {
        update: {
          where: { actorId: 'actor-id' },
          data: { email: 'new@example.com' },
        },
      },
    };
    const updatedActor = { uuid: 'actor-id', name: 'Updated Actor' };
    update.mockResolvedValue(updatedActor);

    await expect(repository.update('actor-id', data)).resolves.toBe(
      updatedActor,
    );
    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { uuid: 'actor-id' },
      data,
      include: { address: true, contactPersons: true },
    });
  });

  it('deletes the related contact persons before the actor in a transaction', async () => {
    const deletedActor = { uuid: 'actor-id', name: 'Deleted Actor' };
    deleteContactPersons.mockResolvedValue({ count: 1 });
    deleteActor.mockResolvedValue(deletedActor);

    await expect(repository.delete('actor-id')).resolves.toBe(deletedActor);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(deleteContactPersons).toHaveBeenCalledExactlyOnceWith({
      where: { actorId: 'actor-id' },
    });
    expect(deleteActor).toHaveBeenCalledExactlyOnceWith({
      where: { uuid: 'actor-id' },
    });
    expect(deleteContactPersons.mock.invocationCallOrder[0]).toBeLessThan(
      deleteActor.mock.invocationCallOrder[0],
    );
  });

  it('deletes an actor that has no contact person', async () => {
    const deletedActor = { uuid: 'private-actor-id' };
    deleteContactPersons.mockResolvedValue({ count: 0 });
    deleteActor.mockResolvedValue(deletedActor);

    await expect(repository.delete('private-actor-id')).resolves.toBe(
      deletedActor,
    );
  });

  it('does not delete the actor if deleting contact persons fails', async () => {
    const error = new Error('Contact deletion failed');
    deleteContactPersons.mockRejectedValue(error);

    await expect(repository.delete('actor-id')).rejects.toBe(error);
    expect(deleteActor).not.toHaveBeenCalled();
  });

  it('propagates actor deletion errors from the transaction', async () => {
    const error = new Error('Actor not found');
    deleteContactPersons.mockResolvedValue({ count: 0 });
    deleteActor.mockRejectedValue(error);

    await expect(repository.delete('missing-id')).rejects.toBe(error);
  });

  it('returns null when Prisma cannot find the actor to delete', async () => {
    deleteActor.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '7',
      }),
    );

    await expect(repository.delete('missing-id')).resolves.toBeNull();
  });

  it('propagates other Prisma deletion errors', async () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Constraint failed',
      {
        code: 'P2003',
        clientVersion: '7',
      },
    );
    deleteActor.mockRejectedValue(error);

    await expect(repository.delete('actor-id')).rejects.toBe(error);
  });

  it('gets an actor by uuid with its related address and contact persons', async () => {
    const actor = { uuid: 'actor-id' };
    findUnique.mockResolvedValue(actor);

    await expect(repository.get('actor-id')).resolves.toBe(actor);
    expect(findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { uuid: 'actor-id' },
      include: { address: true, contactPersons: true },
    });
  });

  it('gets all actors with their related address and contact persons', async () => {
    const actors = [{ uuid: 'actor-id' }];
    findMany.mockResolvedValue(actors);

    await expect(repository.getAll()).resolves.toBe(actors);
    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      include: { address: true, contactPersons: true },
    });
  });

  it('returns null when an actor does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(repository.get('missing-id')).resolves.toBeNull();
  });

  it('returns an empty list when there are no actors', async () => {
    findMany.mockResolvedValue([]);

    await expect(repository.getAll()).resolves.toEqual([]);
  });

  it('propagates create failures', async () => {
    const error = new Error('Create failed');
    create.mockRejectedValue(error);

    await expect(repository.create({} as never)).rejects.toBe(error);
  });

  it('propagates update failures', async () => {
    const error = new Error('Update failed');
    update.mockRejectedValue(error);

    await expect(repository.update('actor-id', { name: 'Actor' })).rejects.toBe(
      error,
    );
  });

  it('propagates read failures', async () => {
    const error = new Error('Database unavailable');
    findUnique.mockRejectedValue(error);
    findMany.mockRejectedValue(error);

    await expect(repository.get('actor-id')).rejects.toBe(error);
    await expect(repository.getAll()).rejects.toBe(error);
  });
});
