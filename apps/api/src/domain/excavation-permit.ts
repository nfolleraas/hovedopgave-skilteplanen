import { v4 as uuidv4 } from 'uuid';
import { TrafficChange } from '../enums/traffic-change.js';
import { Application } from './application.js';

export class ExcavationPermit extends Application {
  constructor(
    caseNumber: string = uuidv4(),
    title: string,
    applicantReference: string,
    public permitType: 'Application' | 'Notice',
    public startDate: Date,
    public endDate: Date,
    public trafficChange: TrafficChange,
  ) {
    super(caseNumber, title, applicantReference, 'Excavation permit');
  }
}
