import { v4 as uuidv4 } from 'uuid';

export class Notification {
  constructor(
    public uuid: string = uuidv4(),
    public date: Date = new Date(),
    public message: string,
    public isRead: boolean = false,
  ) {}
}
