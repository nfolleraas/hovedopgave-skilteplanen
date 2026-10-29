import { v4 as uuidv4 } from 'uuid';

export class Area {
  constructor(
    public uuid: string = uuidv4(),
    public roadName: string,
    public roadOwnership: 'Private' | 'Municipality',
    public postalCode: string,
    public houseNumberTo?: string,
    public houseNumberFrom?: string,
    public alternativeDescription?: string,
  ) {}
}
