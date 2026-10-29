import { v4 as uuidv4 } from 'uuid';
import { SignPlanType } from '../enums/sign-plan-type.js';
import { Document } from './document.js';

export class SignPlan extends Document {
  constructor(
    uuid: string = uuidv4(),
    name: string,
    url: string,
    date: Date = new Date(),
    public signPlanType: SignPlanType,
    public area: string,
    public group: string,
    public plan: string,
  ) {
    super(uuid, name, 'SignPlan', url, date);
  }
}
