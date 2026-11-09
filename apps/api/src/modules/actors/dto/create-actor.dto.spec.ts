import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActorRole } from '../../../generated/prisma/enums.js';
import { CreateActorDto } from './create-actor.dto.js';

describe('CreateActorDto', () => {
  const validActor = {
    applicationCaseNumber: 'CASE-123',
    role: ActorRole.Contractor,
    name: 'Østergaard Entreprise',
    phoneNumber: '12345678',
    email: 'actor@example.com',
    cvrNumber: '87654321',
    department: 'Anlæg',
    address: {
      street: 'Testvej',
      houseNumber: '1',
      postalCode: '5000',
      city: 'Odense',
    },
    contactPerson: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phoneNumber: '87654321',
    },
  };

  it('accepts a business actor with contact person', async () => {
    expect(await validate(plainToInstance(CreateActorDto, validActor))).toEqual(
      [],
    );
  });

  it('accepts a private actor without business fields or contact person', async () => {
    const { cvrNumber, department, contactPerson, ...actor } = validActor;
    expect(
      await validate(
        plainToInstance(CreateActorDto, { ...actor, role: ActorRole.Private }),
      ),
    ).toEqual([]);
  });

  it('rejects missing contact person and invalid phone, email and CVR', async () => {
    const errors = await validate(
      plainToInstance(CreateActorDto, {
        ...validActor,
        phoneNumber: '1234',
        email: 'invalid',
        cvrNumber: 'A1234567',
        contactPerson: undefined,
      }),
    );
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining([
        'phoneNumber',
        'email',
        'cvrNumber',
        'contactPerson',
      ]),
    );
  });
});
