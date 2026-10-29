import { v4 as uuidv4 } from 'uuid';
import { Applicant } from './applicant.js';
import { Municipality } from './municipality.js';

export class Message {
  constructor(
    public uuid: string = uuidv4(),
    public content: string,
    public date: Date = new Date(),
    public applicant: Applicant,
    public municipality: Municipality,
  ) {}
}
