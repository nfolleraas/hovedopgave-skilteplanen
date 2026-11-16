export class UpdateMunicipalityDto {
  name!: string;
  email!: string;
  phoneNumber!: string;
  address!: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
}
