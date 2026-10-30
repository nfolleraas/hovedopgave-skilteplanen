import { v6 as uuidv6 } from 'uuid';
import { TrafficChange } from '../enums/traffic-change.js';
import { Usage } from '../enums/usage.js';
import { Application } from './application.js';
import { ContactPerson } from './contact-person.js';
import { Feedback } from './feedback.js';

export class RoadUsePermit extends Application {
  constructor(
    caseNumber: string = uuidv6(),
    title: string,
    applicantReference: string,
    applicationType: 'Road use permit' | 'Road use permit event',
    feedbacks: Feedback[],
    contactPersons: ContactPerson[],
    public isEvent: boolean,
    public startDate: Date,
    public endDate: Date,
    public eventStart: Date,
    public eventEnd: Date,
    public usage: Usage,
    public usageDescription: string | null,
    public trafficChange: TrafficChange,
  ) {
    super(
      caseNumber,
      title,
      applicantReference,
      applicationType,
      feedbacks,
      contactPersons,
    );
  }
}
