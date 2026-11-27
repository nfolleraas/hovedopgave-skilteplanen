import { defaults as defaultControls } from 'ol/control/defaults.js';
import ScaleLine from 'ol/control/ScaleLine.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import TileLayer from 'ol/layer/Tile.js';
import OpenLayersMap from 'ol/Map.js';
import { unByKey } from 'ol/Observable.js';
import { fromLonLat } from 'ol/proj.js';
import TileWMS from 'ol/source/TileWMS.js';
import View from 'ol/View.js';

import { type RefObject, useEffect, useRef, useState } from 'react';
import {
  baseLayerName,
  defaultLayers,
  type LayerId,
  labelLayers,
  type MapLayerCatalog,
  mapProjection,
  type RoadOverlayId,
  roadOverlays,
  token,
  wmsUrl,
  wmsVersion,
} from './mapLayers';
import { roadDataAttribution } from './roadData';
import type { useRoadSelection } from './useRoadSelection';

type TileError = 'unavailable' | 'overlayError';

/**
 * Calls each handler when its source fails to load a tile, and returns a
 * function that removes the listeners again.
 */
function listenForTileErrors(
  listeners: (readonly [TileWMS, () => void])[],
): () => void {
  const keys = listeners.map(([tileSource, onError]) =>
    tileSource.on('tileloaderror', onError),
  );
  return () => unByKey(keys);
}

export function useDataforsyningenMap({
  mapRef,
  targetRef,
  roadSelectionLayer,
  catalog,
  onTileError,
}: {
  mapRef: RefObject<OpenLayersMap | null>;
  targetRef: RefObject<HTMLDivElement | null>;
  roadSelectionLayer: ReturnType<typeof useRoadSelection>['layer'];
  catalog: MapLayerCatalog | undefined;
  onTileError: (error: TileError) => void;
}) {
  const viewRef = useRef<View>(null);
  const tileLayerRef = useRef<TileLayer<TileWMS>>(null);
  const roadLayersRef = useRef<
    { id: RoadOverlayId; layer: TileLayer<TileWMS> }[]
  >([]);
  const [enabledLayers, setEnabledLayers] = useState<LayerId[]>([
    ...defaultLayers,
  ]);
  const reportedTileErrors = useRef(new Set<TileError>());

  useEffect(() => {
    if (!targetRef.current || !token) return;

    const source = new TileWMS({
      url: wmsUrl,
      params: {
        token,
        LAYERS: [
          baseLayerName,
          ...defaultLayers.map((id) => labelLayers[id]),
        ].join(','),
        FORMAT: 'image/png',
        VERSION: wmsVersion,
        TRANSPARENT: true,
      },
      attributions:
        '&copy; <a href="https://www.klimadatastyrelsen.dk/" target="_blank" rel="noopener noreferrer">Klimadatastyrelsen</a>',
    });
    /** Shows one toast for each kind of tile failure per layer selection. */
    function reportTileFailure(error: TileError) {
      if (reportedTileErrors.current.has(error)) return;
      reportedTileErrors.current.add(error);
      onTileError(error);
    }

    /** Reports a base-map tile failure. */
    const reportTileError = () => reportTileFailure('unavailable');
    /** Flags an optional road-overlay tile failure separately from the base map. */
    const reportOverlayError = () => reportTileFailure('overlayError');
    const overlaySources = roadOverlays.map(({ id, url, name }) => ({
      id,
      source: new TileWMS({
        url,
        params: {
          LAYERS: name,
          FORMAT: 'image/png',
          VERSION: wmsVersion,
          TRANSPARENT: true,
        },
        attributions: roadDataAttribution,
      }),
    }));
    const stopTileErrors = listenForTileErrors([
      [source, reportTileError],
      ...overlaySources.map(
        (overlay) => [overlay.source, reportOverlayError] as const,
      ),
    ]);
    const roadLayers = overlaySources.map(({ id, source: overlaySource }) => ({
      id,
      layer: new TileLayer({ source: overlaySource, visible: false }),
    }));
    roadLayersRef.current = roadLayers;
    const view = new View({
      center: fromLonLat([10.4, 55.7]),
      zoom: 7,
      projection: mapProjection,
      minZoom: 6,
      maxZoom: 20,
    });
    viewRef.current = view;

    const tileLayer = new TileLayer({ source });
    tileLayerRef.current = tileLayer;
    const map = new OpenLayersMap({
      target: targetRef.current,
      layers: [
        tileLayer,
        ...roadLayers.map(({ layer }) => layer),
        roadSelectionLayer,
      ],
      interactions: defaultInteractions({ onFocusOnly: true }),
      controls: defaultControls({
        attributionOptions: { collapsible: false },
        rotate: false,
        zoom: false,
      }).extend([new ScaleLine({ units: 'metric' })]),
      view,
    });
    mapRef.current = map;
    return () => {
      stopTileErrors();
      tileLayerRef.current = null;
      roadLayersRef.current = [];
      mapRef.current = null;
      viewRef.current = null;
      map.dispose();
    };
  }, [mapRef, targetRef, roadSelectionLayer, onTileError]);

  useEffect(() => {
    const source = tileLayerRef.current?.getSource();
    const names = { ...catalog, ...labelLayers };
    const enabled = new Set<string>(enabledLayers);
    const layerNames = [
      baseLayerName,
      ...Object.entries(names)
        .filter(([id]) => enabled.has(id))
        .map(([, name]) => name),
    ].join(',');

    if (source && source.getParams().LAYERS !== layerNames) {
      source.updateParams({ LAYERS: layerNames });
    }

    for (const { id, layer } of roadLayersRef.current) {
      layer.setVisible(enabled.has(id));
    }
  }, [enabledLayers, catalog]);

  function setLayerEnabled(id: LayerId, enabled: boolean) {
    reportedTileErrors.current.clear();
    setEnabledLayers((previous) =>
      enabled ? [...previous, id] : previous.filter((layer) => layer !== id),
    );
  }

  return { viewRef, enabledLayers, setLayerEnabled };
}
