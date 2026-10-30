import { v4 as uuidv4 } from 'uuid';
import { QuestionType } from '../enums/question-type.js';
import { Applicant } from './applicant.js';
import { Application } from './application.js';
import { CaseWorker } from './case-worker.js';
import { Message } from './message.js';

export class MessageThread {
  constructor(
    public uuid: string = uuidv4(),
    public title: string,
    public questionType: QuestionType,
    public date: Date = new Date(),
    public messages: Message[],
    public applicant: Applicant,
    public caseWorker: CaseWorker,
    public application: Application | null,
  ) {}
}
