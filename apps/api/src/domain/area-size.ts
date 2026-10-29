import { v4 as uuidv4 } from 'uuid';

export class AreaSize {
  constructor(
    public uuid: string = uuidv4(),
    public lengthInMeters: number,
    public widthInMeters: number,
    public depthInMeters: number,
    public areaInCubicMeters: number,
  ) {}
}
