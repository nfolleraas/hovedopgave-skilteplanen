import { Address } from './address.js';
import { Application } from './application.js';
import { Feedback } from './feedback.js';
import { MessageThread } from './message-thread.js';
import { Municipality } from './municipality.js';

export class CaseWorker {
  constructor(
    public employeeNumber: string,
    public name: string,
    public email: string,
    public passwordHash: string,
    public phoneNumber: string,
    public address: Address,
    public isSuperUser: boolean = false,
    public municipality: Municipality,
    public messageThreads: MessageThread[],
    public applications: Application[],
    public feedbacks: Feedback[],
  ) {}
}
