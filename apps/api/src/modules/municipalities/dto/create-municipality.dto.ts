export class CreateMunicipalityDto {
  name!: string;
  region!: string;
  email!: string;
  phoneNumber!: string;
  address!: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
  };
}
