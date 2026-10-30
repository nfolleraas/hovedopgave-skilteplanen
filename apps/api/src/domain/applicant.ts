import { v4 as uuidv4 } from 'uuid';
import { Address } from './address.js';
import { Application } from './application.js';
import { MessageThread } from './message-thread.js';

export class Applicant {
  public constructor(
    public uuid: string = uuidv4(),
    public name: string,
    public type: 'Private' | 'Business',
    public phoneNumber: string,
    public email: string,
    public cvrNumber: string | null,
    public mitIdKey: string,
    public skilteplanenKey: string | null,
    public isActive: boolean = true,
    public address: Address,
    public notifications: Notification[],
    public messageThreads: MessageThread[],
    public applications: Application[],
  ) {}
}
