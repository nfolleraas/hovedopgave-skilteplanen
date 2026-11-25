import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CaseWorkersRepository } from './case-workers.repository.js';
import { CaseWorkersService } from './case-workers.service.js';

const actorEmployeeNumber = 'DEMO001';
const municipalityId = 6;
const details = {
  name: 'Anne Müller',
  email: 'anne@example.test',
  phoneNumber: '12345678',
  isSuperUser: false,
};
const input = {
  ...details,
  employeeNumber: 'SB001',
  password: 'Example password',
};

function mockRepository() {
  return {
    findActor: vi.fn<CaseWorkersRepository['findActor']>(),
    findAllByMunicipality:
      vi.fn<CaseWorkersRepository['findAllByMunicipality']>(),
    create: vi.fn<CaseWorkersRepository['create']>(),
    update: vi.fn<CaseWorkersRepository['update']>(),
    delete: vi.fn<CaseWorkersRepository['delete']>(),
  };
}

describe('CaseWorkersService', () => {
  let service: CaseWorkersService;
  let repository: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    repository = mockRepository();
    repository.findActor.mockResolvedValue({
      isSuperUser: true,
      municipalityId,
    });

    const module = await Test.createTestingModule({
      providers: [
        CaseWorkersService,
        { provide: CaseWorkersRepository, useValue: repository },
      ],
    }).compile();
    service = module.get(CaseWorkersService);
  });

  it('lists caseworkers only in the acting superuser’s municipality', async () => {
    const workers = [
      { ...details, employeeNumber: input.employeeNumber, municipalityId },
    ];
    repository.findAllByMunicipality.mockResolvedValue(workers);

    await expect(service.findAll(actorEmployeeNumber)).resolves.toEqual(
      workers,
    );
    expect(repository.findAllByMunicipality).toHaveBeenCalledExactlyOnceWith(
      municipalityId,
    );
  });

  it('rejects listing and creation for an ordinary caseworker', async () => {
    repository.findActor.mockResolvedValue({
      isSuperUser: false,
      municipalityId,
    });

    await expect(service.findAll('SB002')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.create('SB002', input)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.findAllByMunicipality).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([
    ['employee number', { employeeNumber: 'SB-001' }],
    ['name', { name: '123' }],
    ['email address', { email: 'invalid' }],
    ['phone number', { phoneNumber: '1234567' }],
    ['password', { password: '   ' }],
  ])('rejects creation with an invalid %s', async (_field, invalidFields) => {
    await expect(
      service.create(actorEmployeeNumber, { ...input, ...invalidFields }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects an update to the actor’s own record', async () => {
    await expect(
      service.update(actorEmployeeNumber, actorEmployeeNumber, details),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects changing the employee number during an update', async () => {
    const update = { ...details, employeeNumber: 'SB002' };

    await expect(
      service.update(actorEmployeeNumber, input.employeeNumber, update),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('reports a conflict when the repository rejects deleting the last superuser', async () => {
    repository.delete.mockResolvedValue({ conflict: 'lastSuperUser' });

    await expect(
      service.delete(actorEmployeeNumber, input.employeeNumber),
    ).rejects.toThrow(ConflictException);
    expect(repository.delete).toHaveBeenCalledExactlyOnceWith(
      actorEmployeeNumber,
      input.employeeNumber,
    );
  });
});
