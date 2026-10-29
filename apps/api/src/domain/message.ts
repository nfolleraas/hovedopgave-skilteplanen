import { v4 as uuidv4 } from 'uuid';

export class Message {
  constructor(
    public uuid: string = uuidv4(),
    public content: string,
    public date: Date = new Date(),
  ) {}
}
