import { v4 as uuidv4 } from 'uuid';
import { Address } from './address.js';

export class Applicant {
  public constructor(
    public uuid: string = uuidv4(),
    public name: string,
    public type: 'Private' | 'Business',
    public phoneNumber: string,
    public email: string,
    public mitIdKey: string,
    public isActive: boolean = true,
    public address: Address,
    public cvrNumber?: string,
    public skilteplanenKey?: string,
  ) {}
}
