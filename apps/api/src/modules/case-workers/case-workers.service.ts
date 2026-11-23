import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  type CaseWorkerDetails,
  CaseWorkersRepository,
} from './case-workers.repository.js';
import type { CreateCaseWorkerDto } from './dto/create-case-worker.dto.js';
import type { UpdateCaseWorkerDto } from './dto/update-case-worker.dto.js';

const deriveKey = promisify(scrypt);
const employeeNumberPattern = /^[a-zA-Z0-9]{1,10}$/;
const namePattern = /^[\p{L}\p{M} '\u2019-]+$/u;
const emailPattern =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Validates and normalizes the fields shared by creation and update. */
function validateDetails(data: UpdateCaseWorkerDto): UpdateCaseWorkerDto {
  const name =
    typeof data?.name === 'string' ? data.name.trim().normalize('NFC') : '';
  if (!namePattern.test(name) || !/\p{L}/u.test(name)) {
    throw new BadRequestException('Invalid name');
  }

  const email = typeof data.email === 'string' ? data.email.trim() : '';
  if (!emailPattern.test(email)) {
    throw new BadRequestException('Invalid email address');
  }

  if (
    typeof data.phoneNumber !== 'string' ||
    !/^\d{8}$/.test(data.phoneNumber)
  ) {
    throw new BadRequestException('Phone number must contain eight digits');
  }

  if (typeof data.isSuperUser !== 'boolean') {
    throw new BadRequestException('Invalid superuser setting');
  }

  return {
    name,
    email: email.toLowerCase(),
    phoneNumber: data.phoneNumber,
    isSuperUser: data.isSuperUser,
  };
}

@Injectable()
export class CaseWorkersService {
  private readonly logger = new Logger(CaseWorkersService.name);

  /** Injects the repository used for permission checks and persistence. */
  constructor(private readonly repository: CaseWorkersRepository) {}

  /** Lists the caseworkers in the acting superuser’s municipality. */
  async findAll(actorEmployeeNumber: string): Promise<CaseWorkerDetails[]> {
    const municipalityId =
      await this.resolveSuperUserMunicipality(actorEmployeeNumber);
    return this.repository.findAllByMunicipality(municipalityId);
  }

  /** Retrieves caseworker details within the acting superuser’s municipality. */
  async findOne(
    actorEmployeeNumber: string,
    employeeNumber: string,
  ): Promise<CaseWorkerDetails> {
    const municipalityId =
      await this.resolveSuperUserMunicipality(actorEmployeeNumber);
    const caseWorker = await this.repository.findByMunicipality(
      municipalityId,
      employeeNumber,
    );
    if (!caseWorker) {
      throw new NotFoundException('Caseworker not found in this municipality');
    }

    return caseWorker;
  }

  /** Validates and creates a caseworker in the superuser’s municipality. */
  async create(
    actorEmployeeNumber: string,
    data: CreateCaseWorkerDto,
  ): Promise<CaseWorkerDetails> {
    const municipalityId =
      await this.resolveSuperUserMunicipality(actorEmployeeNumber);

    const employeeNumber =
      typeof data?.employeeNumber === 'string'
        ? data.employeeNumber.trim()
        : '';
    if (!employeeNumberPattern.test(employeeNumber)) {
      throw new BadRequestException(
        'Employee number must contain 1 to 10 ASCII letters or digits',
      );
    }

    const details = validateDetails(data);

    if (
      typeof data.password !== 'string' ||
      !data.password.trim() ||
      Buffer.byteLength(data.password) > 1024
    ) {
      throw new BadRequestException('Invalid password');
    }

    const salt = randomBytes(16).toString('hex');
    const key = (await deriveKey(data.password, salt, 64)) as Buffer;
    const result = await this.repository.create({
      employeeNumber,
      ...details,
      passwordHash: `scrypt:${salt}:${key.toString('hex')}`,
      municipalityId,
    });

    if ('caseWorker' in result) {
      return result.caseWorker;
    }

    if (result.conflict === 'employeeNumber') {
      throw new ConflictException('Employee number already exists');
    }

    throw new ConflictException(
      'A caseworker with this email already exists in this municipality',
    );
  }

  /** Updates another caseworker in the actor’s municipality and logs the change. */
  async update(
    actorEmployeeNumber: string,
    employeeNumber: string,
    data: UpdateCaseWorkerDto,
  ): Promise<CaseWorkerDetails> {
    if (actorEmployeeNumber === employeeNumber) {
      throw new ForbiddenException(
        'A superuser can only update another caseworker',
      );
    }

    const details = validateDetails(data);
    if ('employeeNumber' in data) {
      throw new BadRequestException('Employee number cannot be changed');
    }

    const result = await this.repository.update(
      actorEmployeeNumber,
      employeeNumber,
      details,
    );
    if ('caseWorker' in result) {
      if (result.changed) {
        this.logger.log({
          action: 'caseWorker.updated',
          actorEmployeeNumber,
          employeeNumber,
          timestamp: new Date().toISOString(),
        });
      }
      return result.caseWorker;
    }

    switch (result.conflict) {
      case 'forbidden':
        throw new ForbiddenException('Superuser access is required');
      case 'notFound':
        throw new NotFoundException(
          'Caseworker not found in this municipality',
        );
      case 'lastSuperUser':
        throw new ConflictException('The municipality must retain a superuser');
      case 'email':
        throw new ConflictException(
          'Email already belongs to another caseworker',
        );
    }
  }

  /** Deletes another caseworker in the actor’s municipality and logs the outcome. */
  async delete(
    actorEmployeeNumber: string,
    employeeNumber: string,
  ): Promise<void> {
    const audit = {
      actorEmployeeNumber,
      employeeNumber,
    };
    try {
      const result = await this.repository.delete(
        actorEmployeeNumber,
        employeeNumber,
      );
      if ('releasedCases' in result) {
        this.logger.log({
          action: 'caseWorker.deleted',
          ...audit,
          releasedCases: result.releasedCases,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      this.logger.warn({
        action: 'caseWorker.deleteRejected',
        ...audit,
        reason: result.conflict,
        timestamp: new Date().toISOString(),
      });
      switch (result.conflict) {
        case 'forbidden':
          throw new ForbiddenException(
            'A superuser can only delete another caseworker',
          );
        case 'notFound':
          throw new NotFoundException(
            'Caseworker not found in this municipality',
          );
        case 'lastCaseWorker':
          throw new ConflictException(
            'The municipality must retain a caseworker',
          );
        case 'lastSuperUser':
          throw new ConflictException(
            'The municipality must retain a superuser',
          );
      }
    } catch (error) {
      if (
        !(
          error instanceof ForbiddenException ||
          error instanceof NotFoundException ||
          error instanceof ConflictException
        )
      ) {
        this.logger.error({
          action: 'caseWorker.deleteFailed',
          ...audit,
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /** Resolves the municipality after checking the actor’s superuser status. */
  private async resolveSuperUserMunicipality(
    employeeNumber: string,
  ): Promise<number> {
    const actor = await this.repository.findActor(employeeNumber);
    if (!actor?.isSuperUser) {
      throw new ForbiddenException('Superuser access is required');
    }

    return actor.municipalityId;
  }
}
