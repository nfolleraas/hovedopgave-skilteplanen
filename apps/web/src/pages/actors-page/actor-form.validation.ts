import {
  type ActorFormErrors,
  type ActorFormValues,
  ActorRole,
  type ApplicationType,
} from './actor.types.js';

export const actorRoles = Object.values(ActorRole);

const namePattern = /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u;
const eightDigitPattern = /^\d{8}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  applicationType?: ApplicationType,
): ActorFormErrors {
  const errors: ActorFormErrors = {};
  if (!draft.role) errors.role = t('actors.errors.role');
  if (!namePattern.test(draft.name.trim())) {
    errors.name = t('actors.errors.name');
  }
  if (!eightDigitPattern.test(draft.phoneNumber)) {
    errors.phoneNumber = t('actors.errors.phoneNumber');
  }
  if (!emailPattern.test(draft.email.trim())) {
    errors.email = t('actors.errors.email');
  }
  if (draft.role !== ActorRole.Private) {
    if (!eightDigitPattern.test(draft.cvrNumber)) {
      errors.cvrNumber = t('actors.errors.cvrNumber');
    }
    if (!draft.department.trim()) {
      errors.department = t('actors.errors.department');
    }
    if (!namePattern.test(draft.contactPerson.name.trim())) {
      errors.contactPersonName = t('actors.errors.contactPersonName');
    }
    if (!emailPattern.test(draft.contactPerson.email.trim())) {
      errors.contactPersonEmail = t('actors.errors.email');
    }
    if (!eightDigitPattern.test(draft.contactPerson.phoneNumber)) {
      errors.contactPersonPhoneNumber = t('actors.errors.phoneNumber');
    }
    if (
      applicationType === 'ExcavationPermit' &&
      !draft.contactPerson.availability
    ) {
      errors.contactAvailability = t('actors.errors.contactAvailability');
    }
  }
  if (
    !verifiedAddressId ||
    Object.values(draft.address).some((value) => !value.trim())
  ) {
    errors.address = t('actors.errors.address');
  }
  return errors;
}
