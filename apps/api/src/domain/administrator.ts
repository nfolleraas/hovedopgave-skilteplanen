import { v4 as uuidv4 } from 'uuid';

export class Administrator {
  constructor(
    public uuid: string = uuidv4(),
    public name: string,
    public email: string,
    public passwordHash: string,
  ) {}
}
