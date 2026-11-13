import { type Coordinate, squaredDistance } from 'ol/coordinate.js';
import type Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import MultiLineString from 'ol/geom/MultiLineString.js';

type Segment = [Coordinate, Coordinate];
type Snap = { segment: Segment; coordinate: Coordinate; fraction: number };
type Node = { coordinate: Coordinate; neighbors: Map<Node, number> };

/** Projects a point onto the nearest road segment within the snapping tolerance. */
function nearestPoint(
  segments: Segment[],
  point: Coordinate,
  tolerance: number,
) {
  let closest: Snap | undefined;
  let distance = tolerance ** 2;
  for (const segment of segments) {
    const [[x, y], [endX, endY]] = segment;
    const dx = endX - x;
    const dy = endY - y;
    const length = dx * dx + dy * dy;
    if (!length) continue;

    const position = ((point[0] - x) * dx + (point[1] - y) * dy) / length;
    const fraction = Math.max(0, Math.min(1, position));
    const coordinate = [x + fraction * dx, y + fraction * dy];
    const candidateDistance = squaredDistance(point, coordinate);
    if (candidateDistance <= distance) {
      closest = { segment, coordinate, fraction };
      distance = candidateDistance;
    }
  }
  return closest;
}

/** Finds the shortest connected path between two nodes using segment lengths. */
function shortestPath(start: Node, end: Node) {
  const pending = new Map<Node, number>([[start, 0]]);
  const distance = new Map(pending);
  const previous = new Map<Node, Node>();

  while (pending.size) {
    const [node, cost] = [...pending].reduce((closest, candidate) =>
      candidate[1] < closest[1] ? candidate : closest,
    );
    pending.delete(node);
    if (node === end) {
      const path = [];
      for (let step: Node | undefined = end; step; step = previous.get(step)) {
        path.push(step.coordinate);
      }
      return path.reverse();
    }

    for (const [next, length] of node.neighbors) {
      const candidate = cost + length;
      if (candidate >= (distance.get(next) ?? Infinity)) continue;
      pending.set(next, candidate);
      distance.set(next, candidate);
      previous.set(next, node);
    }
  }
}

/** Snaps both endpoints to road geometry and returns their connected path in drawing order. */
export function snapRoadLine(
  roads: Feature[],
  start: Coordinate,
  end: Coordinate,
  tolerance: number,
) {
  const segments: Segment[] = [];
  for (const road of roads) {
    const geometry = road.getGeometry();
    const lines =
      geometry instanceof MultiLineString
        ? geometry.getLineStrings()
        : [geometry];
    for (const line of lines) {
      if (!(line instanceof LineString)) continue;
      const points = line.getCoordinates();
      for (let index = 1; index < points.length; index++) {
        segments.push([points[index - 1], points[index]]);
      }
    }
  }

  const startSnap = nearestPoint(segments, start, tolerance);
  const endSnap = nearestPoint(segments, end, tolerance);
  if (!startSnap || !endSnap) return;

  const nodes = new Map<string, Node>();
  /** Reuses nodes whose coordinates fall in the same rounded half-unit grid cell. */
  function getNode(coordinate: Coordinate) {
    // Join road vertices that differ only by sub-metre rounding in the data.
    const key = `${Math.round(coordinate[0] * 2)},${Math.round(coordinate[1] * 2)}`;
    const existing = nodes.get(key);
    if (existing) return existing;
    const node: Node = { coordinate, neighbors: new Map() };
    nodes.set(key, node);
    return node;
  }

  for (const segment of segments) {
    const snaps = [startSnap, endSnap]
      .filter((snap) => snap.segment === segment)
      .sort((first, second) => first.fraction - second.fraction);
    const points = [
      segment[0],
      ...snaps.map((snap) => snap.coordinate),
      segment[1],
    ];
    for (let index = 1; index < points.length; index++) {
      const from = getNode(points[index - 1]);
      const to = getNode(points[index]);
      if (from === to) continue;
      const distance = Math.sqrt(
        squaredDistance(from.coordinate, to.coordinate),
      );
      from.neighbors.set(to, distance);
      to.neighbors.set(from, distance);
    }
  }

  const from = getNode(startSnap.coordinate);
  const to = getNode(endSnap.coordinate);
  if (from === to) return;
  const path = shortestPath(from, to);
  if (!path) return;
  path[0] = startSnap.coordinate;
  path[path.length - 1] = endSnap.coordinate;
  return new LineString(path);
}
