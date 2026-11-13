import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { Prisma } from '../../../generated/prisma/client.js';
import { mapApplicantCreateError } from './applicant-error.mapper.js';

describe('mapApplicantCreateError', () => {
  it('maps duplicate email errors to a friendly message', () => {
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['email'] },
    });

    expect(() => mapApplicantCreateError(error)).toThrow(ConflictException);
    expect(() => mapApplicantCreateError(error)).toThrow(
      'Der findes allerede en ansøger med den e-mail.',
    );
  });

  it('maps duplicate CVR errors to a friendly message', () => {
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['cvrNumber'] },
    });

    expect(() => mapApplicantCreateError(error)).toThrow(ConflictException);
    expect(() => mapApplicantCreateError(error)).toThrow(
      'Der findes allerede en ansøger med det CVR-nummer.',
    );
  });

  it('maps unknown unique constraint targets to a generic message', () => {
    const error = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['somethingElse'] },
    });

    expect(() => mapApplicantCreateError(error)).toThrow(ConflictException);
    expect(() => mapApplicantCreateError(error)).toThrow('Ansøger findes allerede.');
  });

  it('rethrows non-Prisma errors unchanged', () => {
    expect(() => mapApplicantCreateError(new Error('boom'))).toThrow('boom');
  });
});

