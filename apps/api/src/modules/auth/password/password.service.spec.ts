import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('creates a salted Argon2id hash that verifies the supplied password', async () => {
    const hash = await service.hash('correct horse battery staple');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(
      service.verify('correct horse battery staple', hash),
    ).resolves.toBe(true);
  });

  it('rejects a wrong password and malformed persisted hash', async () => {
    const hash = await service.hash('correct horse battery staple');

    await expect(service.verify('wrong password', hash)).resolves.toBe(false);
    await expect(
      service.verify('correct horse battery staple', 'not-an-argon2-hash'),
    ).resolves.toBe(false);
  });
});
