export class CreateApplicantDto {
  name!: string;
  type!: 'private' | 'business';
  phoneNumber!: string;
  email!: string;
  cvrNumber?: string;
  street!: string;
  houseNumber!: string;
  postalCode!: string;
  city!: string;
}
