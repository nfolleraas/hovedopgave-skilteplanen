import { v4 as uuidv4 } from 'uuid';
import { RoadSection } from '../enums/road-section.js';
import { RoadSide } from '../enums/road-side.js';

export class AreaDetail {
  constructor(
    public uuid: string = uuidv4(),
    public roadSection: RoadSection,
    public roadSide: RoadSide,
    public direction: 'Along' | 'Across',
    public roadSectionDescription?: string,
  ) {}
}
