import { lookupCompany } from '../../api/companies.api.js';
import {
  ActorRole,
  type ActorSubmission,
  actorRoles,
  type CreateActorErrors,
  type CreateActorValues,
} from './actor.types.js';

export const eightDigitPattern = /^\d{8}$/;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreateActor(
  values: CreateActorValues,
): CreateActorErrors {
  const errors: CreateActorErrors = {};
  const required: Exclude<keyof CreateActorValues, 'address' | 'addressId'>[] =
    ['role', 'name', 'phoneNumber', 'email'];
  if (values.role !== ActorRole.Private) {
    required.push('cvrNumber', 'department');
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
  const digitFields: ('phoneNumber' | 'cvrNumber')[] = ['phoneNumber'];
  if (values.role !== ActorRole.Private) digitFields.push('cvrNumber');
  for (const field of digitFields) {
    if (values[field].trim() && !eightDigitPattern.test(values[field].trim())) {
      errors[field] = 'Angiv præcis 8 cifre.';
    }
  }
  if (values.email.trim() && !emailPattern.test(values.email.trim())) {
    errors.email = 'Ugyldigt e-mailformat. Brug f.eks. navn@eksempel.dk.';
  }
  return errors;
}

export async function validateActorCvr(
  values: Pick<CreateActorValues, 'role' | 'cvrNumber'>,
): Promise<string | undefined> {
  if (values.role === ActorRole.Private) return undefined;
  const cvrNumber = values.cvrNumber.trim();
  if (!eightDigitPattern.test(cvrNumber)) return 'Angiv præcis 8 cifre.';
  try {
    await lookupCompany(cvrNumber);
    return undefined;
  } catch (error: unknown) {
    return error instanceof Error && error.name === 'Error'
      ? `${error.message} CVR-nummeret skal bekræftes, før aktøren kan gemmes.`
      : 'CVR-nummeret kunne ikke bekræftes. Prøv igen, før du gemmer aktøren.';
  }
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
        }
      : {}),
  };
}
