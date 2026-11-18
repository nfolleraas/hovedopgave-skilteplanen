export interface MunicipalityAddress {
  uuid: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
}

export interface Municipality {
  id: number;
  name: string;
  region: string;
  email: string;
  phoneNumber: string;
  addressId: string;
  address: MunicipalityAddress;
}

export interface CreateMunicipality {
  name: string;
  region: string;
  email: string;
  phoneNumber: string;
  address: Omit<MunicipalityAddress, 'uuid'>;
}

export interface UpdateMunicipality {
  email: string;
  phoneNumber: string;
  address: Omit<MunicipalityAddress, 'uuid'>;
}
