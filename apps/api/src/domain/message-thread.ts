import { v4 as uuidv4 } from 'uuid';
import { QuestionType } from '../enums/question-type.js';

export class MessageThread {
  constructor(
    public uuid: string = uuidv4(),
    public title: string,
    public questionType: QuestionType,
    public date: Date = new Date(),
  ) {}
}
