import type {
  Municipality,
  UpdateMunicipality,
} from '../../types/municipality.types.js';

// Map municipality data to editable form values
export function mapMunicipalityToForm(
  municipality: Municipality,
): UpdateMunicipality {
  return {
    email: municipality.email,
    phoneNumber: municipality.phoneNumber,
    address: {
      street: municipality.address.street,
      houseNumber: municipality.address.houseNumber,
      postalCode: municipality.address.postalCode,
      city: municipality.address.city,
    },
  };
}
