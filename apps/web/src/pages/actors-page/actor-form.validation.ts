import type {
  ActorFormErrors,
  ActorFormValues,
  ApplicationType,
} from './actor.types.js';

import { validateCreateActor } from './create-actor-form.validation.js';

const namePattern = /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u;

export function emptyActorForm(): ActorFormValues {
  return {
    role: '',
    name: '',
    phoneNumber: '',
    email: '',
    cvrNumber: '',
    department: '',
    contactPerson: {
      name: '',
      email: '',
      phoneNumber: '',
      availability: '',
    },
    address: { street: '', houseNumber: '', postalCode: '', city: '' },
  };
}

export function validateActorForm(
  draft: ActorFormValues,
  t: (key: string) => string,
  verifiedAddressId: string | null,
  _applicationType?: ApplicationType,
): ActorFormErrors {
  const commonErrors = validateCreateActor({
    ...draft,
    addressId: verifiedAddressId,
  });
  const errors: ActorFormErrors = {};
  const messages = {
    role: 'actors.errors.role',
    name: 'actors.errors.name',
    phoneNumber: 'actors.errors.phoneNumber',
    email: 'actors.errors.email',
    cvrNumber: 'actors.errors.cvrNumber',
    department: 'actors.errors.department',
    address: 'actors.errors.address',
  } as const;
  for (const field of Object.keys(messages) as (keyof typeof messages)[]) {
    if (commonErrors[field]) errors[field] = t(messages[field]);
  }
  // Contact details and permit-specific availability remain placeholders until
  // the contact-person feature branch is merged; they must not block saving.
  if (!namePattern.test(draft.name.trim())) {
    errors.name = t('actors.errors.name');
  }
  return errors;
}
