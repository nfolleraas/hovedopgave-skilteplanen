import { v6 as uuidv6 } from 'uuid';
import { TrafficChange } from '../enums/traffic-change.js';
import { Usage } from '../enums/usage.js';
import { Application } from './application.js';

export class RoadUsePermit extends Application {
  constructor(
    caseNumber: string = uuidv6(),
    title: string,
    applicantReference: string,
    applicationType: 'Road use permit' | 'Road use permit event',
    public isEvent: boolean,
    public startDate: Date,
    public endDate: Date,
    public eventStart: Date,
    public eventEnd: Date,
    public usage: Usage,
    public trafficChange: TrafficChange,
    public usageDescription?: string,
  ) {
    super(caseNumber, title, applicantReference, applicationType);
  }
}
