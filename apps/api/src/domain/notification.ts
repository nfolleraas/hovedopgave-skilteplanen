import { v4 as uuidv4 } from 'uuid';
import { Applicant } from './applicant.js';
import { CaseWorker } from './case-worker.js';

export class Notification {
  constructor(
    public uuid: string = uuidv4(),
    public date: Date = new Date(),
    public message: string,
    public isRead: boolean = false,
    public applicant?: Applicant,
    public caseWorker?: CaseWorker,
  ) {}
}
