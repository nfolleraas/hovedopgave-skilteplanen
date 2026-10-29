import { v4 as uuidv4 } from 'uuid';

export class Document {
  constructor(
    public uuid: string = uuidv4(),
    public name: string,
    public documentType: 'SignPlan' | 'Other',
    public url: string,
    public date: Date = new Date(),
  ) {}
}
