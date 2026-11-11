import { ValidationPipe } from '@nestjs/common';
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

  it('contains the actor data used when creating an actor', () => {
    const dto = Object.assign(new CreateActorDto(), validActor);

    expect(dto).toEqual(validActor);
  });

  it('accepts the frontend payload through the global validation settings', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const metadata = { type: 'body' as const, metatype: CreateActorDto };
    await expect(pipe.transform(validActor, metadata)).resolves.toMatchObject(
      validActor,
    );
    await expect(
      pipe.transform(
        {
          ...validActor,
          contactPerson: { ...validActor.contactPerson, email: 'invalid' },
        },
        metadata,
      ),
    ).rejects.toThrow();
  });

  it('supports private actors without business fields or contact person', () => {
    const { cvrNumber, department, contactPerson, ...actor } = validActor;
    const dto = Object.assign(new CreateActorDto(), {
      ...actor,
      role: ActorRole.Private,
    });

    expect(dto).toEqual({ ...actor, role: ActorRole.Private });
  });
});
