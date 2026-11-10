import { PrismaService } from '../../prisma.service.js';
import { ActorsRepository } from './actors.repository.js';

describe('ActorsRepository', () => {
  const create = vi.fn();
  const findUnique = vi.fn();
  const findMany = vi.fn();
  let repository: ActorsRepository;

  beforeEach(() => {
    create.mockReset();
    findUnique.mockReset();
    findMany.mockReset();
    repository = new ActorsRepository({
      actor: { create, findUnique, findMany },
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
});
