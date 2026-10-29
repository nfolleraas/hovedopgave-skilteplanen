import { v4 as uuidv4 } from 'uuid';

export abstract class Application {
  constructor(
    public caseNumber: string = uuidv4(),
    public title: string,
    public applicantReference: string,
    public type:
      | 'Excavation permit'
      | 'Road use permit'
      | 'Road use permit event',
  ) {}
}
