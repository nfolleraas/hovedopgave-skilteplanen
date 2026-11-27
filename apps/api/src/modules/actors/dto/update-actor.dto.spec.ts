import { ValidationPipe } from '@nestjs/common';
import { UpdateActorDto } from './update-actor.dto.js';

describe('UpdateActorDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const metadata = { type: 'body' as const, metatype: UpdateActorDto };
  const address = {
    street: 'Testvej',
    houseNumber: '1',
    postalCode: '5000',
    city: 'Odense',
  };

  it('allows omitted fields in partial updates', async () => {
    await expect(pipe.transform({}, metadata)).resolves.toEqual({});
    await expect(
      pipe.transform({ name: 'Updated Actor' }, metadata),
    ).resolves.toMatchObject({ name: 'Updated Actor' });
  });

  it('accepts valid actor fields and a complete nested address', async () => {
    const input = {
      name: 'Updated Actor',
      phoneNumber: '12345678',
      email: 'actor@example.com',
      cvrNumber: '87654321',
      department: 'Anlæg',
      address,
    };
    await expect(pipe.transform(input, metadata)).resolves.toMatchObject(input);
  });

  it.each([
    ['name', 123],
    ['name', '   '],
    ['phoneNumber', '123'],
    ['phoneNumber', 12345678],
    ['email', 'invalid'],
    ['cvrNumber', 'abcdefgh'],
    ['department', '   '],
    ['address', {}],
    ['address', []],
    ['address', { ...address, street: 123 }],
    ['address', { ...address, unexpected: true }],
  ])('rejects invalid %s: %j', async (field, value) => {
    await expect(pipe.transform({ [field]: value }, metadata)).rejects.toThrow(
      'Bad Request Exception',
    );
  });

  it.each([
    'name',
    'phoneNumber',
    'email',
    'cvrNumber',
    'department',
    'address',
  ])(
    'rejects explicit null for %s instead of treating it as omitted',
    async (field) => {
      await expect(pipe.transform({ [field]: null }, metadata)).rejects.toThrow(
        'Bad Request Exception',
      );
    },
  );

  it.each(['street', 'houseNumber', 'postalCode', 'city'])(
    'rejects a whitespace-only address %s',
    async (field) => {
      await expect(
        pipe.transform({ address: { ...address, [field]: '   ' } }, metadata),
      ).rejects.toThrow('Bad Request Exception');
    },
  );
});
