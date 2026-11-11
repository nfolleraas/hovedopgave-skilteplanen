import { ActorRole, Availability } from '../../../generated/prisma/enums.js';
import type { CreateActorDto } from '../dto/create-actor.dto.js';
import { ActorMapper } from './actor.mapper.js';

describe('ActorMapper', () => {
  let mapper: ActorMapper;
  let dto: CreateActorDto;

  beforeEach(() => {
    mapper = new ActorMapper();
    dto = {
      applicationCaseNumber: 'CASE-123',
      role: ActorRole.Contractor,
      name: ' Eksempel Entreprise ',
      email: ' kontakt@example.com ',
      phoneNumber: '12345678',
      cvrNumber: '87654321',
      department: ' Anlæg ',
      address: {
        street: ' Testvej ',
        houseNumber: ' 12A ',
        postalCode: ' 5000 ',
        city: ' Odense ',
      },
      contactPerson: {
        name: ' Jane Doe ',
        email: ' jane@example.com ',
        phoneNumber: '23456789',
        availability: Availability.Day,
      },
    };
  });

  describe('toCreateInput', () => {
    it('connects an existing address without creating another one', () => {
      expect(mapper.toCreateInput(dto, 'address-id').address).toEqual({
        connect: { uuid: 'address-id' },
      });
    });

    it('trims text and connects the actor to the application', () => {
      expect(mapper.toCreateInput(dto)).toEqual({
        role: ActorRole.Contractor,
        name: 'Eksempel Entreprise',
        email: 'kontakt@example.com',
        phoneNumber: '12345678',
        cvrNumber: '87654321',
        department: 'Anlæg',
        applications: { connect: { caseNumber: 'CASE-123' } },
        address: {
          create: {
            street: 'Testvej',
            houseNumber: '12A',
            postalCode: '5000',
            city: 'Odense',
          },
        },
      });
    });

    it('clears business fields and omits the contact person for private actors', () => {
      const input = mapper.toCreateInput({ ...dto, role: ActorRole.Private });

      expect(input).toMatchObject({
        role: ActorRole.Private,
        cvrNumber: null,
        department: null,
      });
      expect(input).not.toHaveProperty('contactPersons');
    });

    it('supports omitted optional business fields', () => {
      const input = mapper.toCreateInput({
        ...dto,
        cvrNumber: undefined,
        department: undefined,
        contactPerson: undefined,
      });

      expect(input.cvrNumber).toBeUndefined();
      expect(input.department).toBeUndefined();
      expect(input).not.toHaveProperty('contactPersons');
    });

    it('does not mutate the creation DTO', () => {
      const original = structuredClone(dto);

      mapper.toCreateInput(dto);

      expect(dto).toEqual(original);
    });
  });

  describe('toUpdateInput', () => {
    it('connects a matching address instead of modifying the shared address', () => {
      expect(
        mapper.toUpdateInput({ address: dto.address }, 'address-id').address,
      ).toEqual({ connect: { uuid: 'address-id' } });
    });

    it('leaves all fields unchanged for an empty update', () => {
      expect(mapper.toUpdateInput({})).toEqual({});
    });

    it('maps supplied actor fields and trims text', () => {
      expect(
        mapper.toUpdateInput({
          name: ' Updated Actor ',
          email: ' updated@example.com ',
          phoneNumber: '87654321',
          cvrNumber: '12345678',
          department: ' Service ',
        }),
      ).toEqual({
        name: 'Updated Actor',
        email: 'updated@example.com',
        phoneNumber: '87654321',
        cvrNumber: '12345678',
        department: 'Service',
      });
    });

    it('updates business fields without requiring a role change', () => {
      expect(
        mapper.toUpdateInput({
          cvrNumber: '12345678',
          department: ' Service ',
        }),
      ).toEqual({ cvrNumber: '12345678', department: 'Service' });
    });

    it.each(Object.values(ActorRole))(
      'never maps a submitted role %s into an update',
      (role) => {
        const input = { role, name: ' Updated Actor ' };

        expect(mapper.toUpdateInput(input)).toEqual({
          name: 'Updated Actor',
        });
      },
    );

    it('preserves explicit empty strings in partial updates', () => {
      expect(
        mapper.toUpdateInput({
          name: '',
          email: '',
          phoneNumber: '',
          cvrNumber: '',
          department: ' ',
        }),
      ).toEqual({
        name: '',
        email: '',
        phoneNumber: '',
        cvrNumber: '',
        department: '',
      });
    });

    it('creates a separate address with trimmed fields when updating', () => {
      expect(mapper.toUpdateInput({ address: dto.address })).toEqual({
        address: {
          create: {
            street: 'Testvej',
            houseNumber: '12A',
            postalCode: '5000',
            city: 'Odense',
          },
        },
      });
    });

    it('omits contact details from actor updates', () => {
      expect(
        mapper.toUpdateInput({
          name: ' Updated Actor ',
          contactPerson: dto.contactPerson,
        }),
      ).toEqual({ name: 'Updated Actor' });
    });

    it('does not mutate the update DTO', () => {
      const update = {
        name: dto.name,
        address: dto.address,
        contactPerson: dto.contactPerson,
      };
      const original = structuredClone(update);

      mapper.toUpdateInput(update);

      expect(update).toEqual(original);
    });
  });
});
