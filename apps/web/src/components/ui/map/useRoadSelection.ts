import { type Coordinate, squaredDistance } from 'ol/coordinate.js';
import { boundingExtent, buffer } from 'ol/extent.js';
import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import VectorLayer from 'ol/layer/Vector.js';
import type OpenLayersMap from 'ol/Map.js';
import type MapBrowserEvent from 'ol/MapBrowserEvent.js';
import VectorSource from 'ol/source/Vector.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { RoadLocation } from '../../../utils/validateRoadLocation';
import { findRoadRange } from './findRoadRange';
import {
  findNearestRoad,
  getRoadCodes,
  readRoads,
  roadDataAttribution,
} from './roadData';
import { snapRoadLine } from './snapRoadLine';

const hitTolerance = 10;
const maxRadius = 60;
const sketchStyle = new Style({
  stroke: new Stroke({ color: '#1562AD', width: 3, lineDash: [8, 5] }),
});

type RoadSelectionStatus =
  | 'zoomIn'
  | 'loading'
  | 'noRoad'
  | 'error'
  | 'drawEnd'
  | 'noPath'
  | 'drawn';

export function useRoadSelection(mapRef: RefObject<OpenLayersMap | null>) {
  const requestRef = useRef<AbortController>(null);
  const [drawingRoad, setDrawing] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [drawnRoad, setDrawnRoad] = useState<{
    feature: Feature;
    location: RoadLocation;
  } | null>(null);
  const [status, setStatus] = useState<RoadSelectionStatus | null>(null);
  const [sketch] = useState(() => {
    const feature = new Feature<LineString>();
    feature.setStyle(sketchStyle);
    return feature;
  });
  const [layer] = useState(
    () =>
      new VectorLayer({
        source: new VectorSource<Feature>({
          attributions: roadDataAttribution,
        }),
        visible: false,
        style: [
          new Style({ stroke: new Stroke({ color: '#FFFFFF', width: 8 }) }),
          new Style({ stroke: new Stroke({ color: '#1562AD', width: 5 }) }),
        ],
      }),
  );

  const resetSketch = useCallback(() => {
    sketch.setGeometry(undefined);
    const source = layer.getSource();
    if (source?.hasFeature(sketch)) source.removeFeature(sketch);
    layer.setVisible(Boolean(source?.getFeatures().length));
  }, [layer, sketch]);

  function cancelDrawnRoad() {
    requestRef.current = null;
    setDrawnRoad(null);
    resetSketch();
  }

  function confirmDrawnRoad() {
    if (!drawnRoad) return;
    requestRef.current = null;
    resetSketch();
    const source = layer.getSource();
    source?.clear();
    source?.addFeature(drawnRoad.feature);
    layer.setVisible(true);
    setHasSelection(true);
    setDrawnRoad(null);
    setDrawing(false);
    setStatus('drawn');
  }

  const setDrawingRoad = useCallback(
    (active: boolean) => {
      requestRef.current?.abort();
      requestRef.current = null;
      setDrawnRoad(null);
      resetSketch();
      setStatus(null);
      setDrawing(active);
    },
    [resetSketch],
  );

  function redrawRoad() {
    layer.getSource()?.clear();
    setHasSelection(false);
    setDrawingRoad(true);
  }

  useEffect(() => {
    const map = mapRef.current;
    const target = map?.getTargetElement();
    if (!drawingRoad || !map || !target) return;
    const view = map.getView();
    const projection = view.getProjection().getCode();
    const source = layer.getSource();

    async function drawRoad(
      start: Coordinate,
      end: Coordinate,
      radius: number,
    ) {
      const request = new AbortController();
      requestRef.current = request;
      setStatus('loading');
      let awaitingConfirmation = false;
      try {
        const road = await findNearestRoad(
          start,
          radius,
          projection,
          request.signal,
        );
        if (request.signal.aborted) return;
        if (!road) {
          setStatus('noRoad');
          return;
        }
        const codes = getRoadCodes(road);
        const margin = Math.max(
          radius * 2,
          Math.sqrt(squaredDistance(start, end)) / 2,
        );
        const roads = codes
          ? await readRoads(
              buffer(boundingExtent([start, end]), margin),
              projection,
              request.signal,
              codes,
            )
          : [road];
        if (request.signal.aborted) return;
        const line = snapRoadLine(roads, start, end, radius);
        if (!line) {
          setStatus('noPath');
          return;
        }

        const location = await findRoadRange(
          road,
          line,
          projection,
          request.signal,
        );
        if (request.signal.aborted) return;

        const stretch = road.clone();
        stretch.setGeometry(line);
        sketch.setGeometry(line);
        target?.focus({ preventScroll: true });
        setDrawnRoad({ feature: stretch, location });
        setStatus(null);
        awaitingConfirmation = true;
      } catch {
        if (!request.signal.aborted) setStatus('error');
      } finally {
        if (requestRef.current === request && !awaitingConfirmation) {
          requestRef.current = null;
          resetSketch();
        }
      }
    }

    function updateSketch(end: Coordinate) {
      const geometry = sketch.getGeometry();
      if (!geometry || requestRef.current) return;
      geometry.setCoordinates([geometry.getFirstCoordinate(), end]);
    }

    function handlePoint(coordinate: Coordinate) {
      const resolution = view.getResolution() ?? Infinity;
      const radius = resolution * hitTolerance;
      if (requestRef.current) return;
      if (radius > maxRadius) {
        setStatus('zoomIn');
        return;
      }
      const start = sketch.getGeometry()?.getFirstCoordinate();
      if (start) {
        updateSketch(coordinate);
        void drawRoad(start, coordinate, radius);
      } else {
        sketch.setGeometry(new LineString([coordinate, coordinate]));
        source?.addFeature(sketch);
        layer.setVisible(true);
        setStatus('drawEnd');
      }
    }

    function handleClick(event: MapBrowserEvent) {
      handlePoint(event.coordinate);
    }

    function handlePointerMove(event: MapBrowserEvent) {
      if (!event.dragging) updateSketch(event.coordinate);
    }

    function handleMoveEnd() {
      const center = view.getCenter();
      if (center && target?.matches(':focus-visible')) updateSketch(center);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.target !== target) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setDrawingRoad(false);
      }
      if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault();
        const center = view.getCenter();
        if (center) handlePoint(center);
      }
    }

    map.on('singleclick', handleClick);
    map.on('pointermove', handlePointerMove);
    map.on('moveend', handleMoveEnd);
    target.addEventListener('keydown', handleKeyDown);
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
      resetSketch();
      map.un('singleclick', handleClick);
      map.un('pointermove', handlePointerMove);
      map.un('moveend', handleMoveEnd);
      target.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawingRoad, layer, mapRef, resetSketch, setDrawingRoad, sketch]);

  return {
    cancelDrawnRoad,
    confirmDrawnRoad,
    drawnRoad,
    drawingRoad,
    hasSelection,
    layer,
    redrawRoad,
    setDrawingRoad,
    status,
  };
}
