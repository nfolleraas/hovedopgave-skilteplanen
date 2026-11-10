import {
  ActorRole,
  type ActorSubmission,
  type CreateActorErrors,
  type CreateActorValues,
} from './actor.types.js';
import { actorRoles } from './actor-form.validation.js';

export function validateCreateActor(
  values: CreateActorValues,
): CreateActorErrors {
  const errors: CreateActorErrors = {};
  const required: Exclude<keyof CreateActorValues, 'address' | 'addressId'>[] =
    ['role', 'name', 'phoneNumber', 'email'];
  if (values.role && values.role !== ActorRole.Private) {
    required.push('cvrNumber', 'department', 'contactPerson');
  }
  for (const field of required) {
    if (!values[field].trim()) errors[field] = 'Udfyld feltet.';
  }
  if (!values.role || !actorRoles.includes(values.role))
    errors.role = 'Vælg en rolle.';
  if (
    !values.addressId ||
    !values.address ||
    Object.values(values.address).some((part) => !part.trim())
  ) {
    errors.address = 'Vælg en adresse fra søgeresultaterne.';
  }
  const digitFields: ('phoneNumber' | 'cvrNumber' | 'department')[] = [
    'phoneNumber',
  ];
  if (values.role && values.role !== ActorRole.Private)
    digitFields.push('cvrNumber', 'department');
  for (const field of digitFields) {
    if (values[field].trim() && !/^\d{8}$/.test(values[field].trim())) {
      errors[field] = 'Angiv præcis 8 cifre.';
    }
  }
  if (
    values.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
  ) {
    errors.email = 'Angiv en gyldig e-mailadresse.';
  }
  return errors;
}

export function toActorSubmission(values: CreateActorValues): ActorSubmission {
  if (!values.role || !actorRoles.includes(values.role)) {
    throw new Error('Vælg en rolle.');
  }
  if (
    !values.addressId ||
    !values.address ||
    Object.values(values.address).some((part) => !part.trim())
  ) {
    throw new Error('Vælg en adresse fra søgeresultaterne.');
  }
  return {
    role: values.role,
    name: values.name.trim(),
    phoneNumber: values.phoneNumber.trim(),
    email: values.email.trim(),
    address: {
      street: values.address.street.trim(),
      houseNumber: values.address.houseNumber.trim(),
      postalCode: values.address.postalCode.trim(),
      city: values.address.city.trim(),
    },
    ...(values.role !== ActorRole.Private
      ? {
          cvrNumber: values.cvrNumber.trim(),
          department: values.department.trim(),
          contactPerson: values.contactPerson.trim(),
        }
      : {}),
  };
}
