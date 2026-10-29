import { v4 as uuidv4 } from 'uuid';
import { Availability } from '../enums/availability.js';

export class ContactPerson {
  constructor(
    public uuid: string = uuidv4(),
    public name: string,
    public email: string,
    public phoneNumber: string,
    public availability: Availability,
  ) {}
}
