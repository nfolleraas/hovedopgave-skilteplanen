export class CreateApplicantDto {
  name!: string;
  type!: 'private' | 'business';
  phoneNumber!: string;
  email!: string;
  cvrNumber?: string;
  addressLookupId!: string;
  houseNumber!: string;
}
