import type { PrismaService } from '../../prisma/prisma.service.js';
import { MitidAuditRepository } from './mitid-audit.repository.js';

describe('MitidAuditRepository', () => {
  it('records the verified employee identity without provider credentials', async () => {
    const create = vi.fn().mockResolvedValue({});
    const prisma = { authAuditEvent: { create } };
    const repository = new MitidAuditRepository(
      prisma as unknown as PrismaService,
    );

    await repository.recordBusinessLoginSuccess('business-applicant-123', {
      organisationCvr: '95338926',
      employeeUuid: 'eea6df96-c347-4cd3-ab08-7df0af052e83',
      providerSubject: 'signicat-provider-subject',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        eventType: 'LOGIN_SUCCESS',
        actor: 'APPLICANT',
        principalId: 'business-applicant-123',
        provider: 'SIGNICAT',
        success: true,
        metadata: {
          loginType: 'BUSINESS_APPLICANT',
          cvrNumber: '95338926',
          employeeUuid: 'eea6df96-c347-4cd3-ab08-7df0af052e83',
          providerSubject: 'signicat-provider-subject',
        },
      },
    });
    expect(JSON.stringify(create.mock.calls)).not.toMatch(
      /accessToken|idToken|authorizationCode|nonce|pkce/i,
    );
  });
});
