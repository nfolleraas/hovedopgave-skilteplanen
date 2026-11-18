import type {
  Municipality,
  UpdateMunicipality,
} from '../../types/municipality.types.js';

/**
 * Extracts the editable contact and address fields from the API response. The
 * result is used to populate, reset, and submit the edit form.
 */
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
