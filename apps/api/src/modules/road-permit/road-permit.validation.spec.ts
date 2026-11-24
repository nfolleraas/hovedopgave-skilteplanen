import { roadPermitSubmission } from '../../../test/fixtures/road-permit.js';
import { parseRoadPermitSubmission } from './road-permit.validation.js';

describe('Optional road-permit contact information', () => {
  it('accepts blank contact fields when the application has no actors', () => {
    const submission = {
      ...roadPermitSubmission,
      contactInformation: { name: '', phone: '', email: '' },
    };

    expect(() => parseRoadPermitSubmission(submission)).not.toThrow();
  });

  it('still rejects incomplete supplied contact details', () => {
    const submission = {
      ...roadPermitSubmission,
      contactInformation: { name: 'Contact', phone: '', email: '' },
    };

    expect(() => parseRoadPermitSubmission(submission)).toThrow();
  });
});
