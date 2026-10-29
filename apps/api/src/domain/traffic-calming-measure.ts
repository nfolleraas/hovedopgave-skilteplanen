import { TrafficCalmingMeasureScope } from '../enums/traffic-calming-measure-scrope.js';

export class TrafficCalmingMeasure {
  constructor(
    public type: string,
    public protectionLevel: string,
    public scope: TrafficCalmingMeasureScope,
    public description: string,
  ) {}
}
