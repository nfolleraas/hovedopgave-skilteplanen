import { v4 as uuidv4 } from 'uuid';
import { MaterialType } from '../enums/material-type.js';

export class Material {
  constructor(
    public uuid: string = uuidv4(),
    public type: MaterialType,
    public amount: number,
    public description: string,
  ) {}
}
