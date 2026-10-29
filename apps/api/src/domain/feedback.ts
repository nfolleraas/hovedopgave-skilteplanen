import { v4 as uuidv4 } from 'uuid';

export class Feedback {
  constructor(
    public uuid: string = uuidv4(),
    public category: 'Category',
    public IsRead: boolean = false,
    public message: string,
  ) {}
}
