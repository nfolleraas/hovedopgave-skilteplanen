export class UpdateMunicipalityDto {
  email!: string;
  phoneNumber!: string;
  address!: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
}
