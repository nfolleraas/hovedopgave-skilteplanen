// @vitest-environment node
import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import MultiLineString from 'ol/geom/MultiLineString.js';
import { describe, expect, it } from 'vitest';
import { snapRoadLine } from '../components/ui/map/snapRoadLine';

const roads = [
  new Feature(
    new LineString([
      [0, 0],
      [10, 0],
      [10, 10],
    ]),
  ),
  new Feature(
    new MultiLineString([
      [
        [10, 10],
        [20, 10],
      ],
      [
        [30, 0],
        [30, 10],
      ],
    ]),
  ),
];

describe('Road line snapping', () => {
  it('follows bends and joins features between the two snapped points', () => {
    expect(snapRoadLine(roads, [4, 1], [16, 11], 2)?.getCoordinates()).toEqual([
      [4, 0],
      [10, 0],
      [10, 10],
      [16, 10],
    ]);
  });

  it('preserves the drawing direction when both points are on one segment', () => {
    expect(snapRoadLine(roads, [8, 1], [4, 1], 2)?.getCoordinates()).toEqual([
      [8, 0],
      [4, 0],
    ]);
  });

  it('rejects disconnected roads and endpoints outside the snapping distance', () => {
    expect(snapRoadLine(roads, [4, 1], [30, 3], 2)).toBeUndefined();
    expect(snapRoadLine(roads, [4, 1], [16, 17], 2)).toBeUndefined();
  });
});
