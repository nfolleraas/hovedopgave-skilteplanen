import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  Alert,
  Box,
  FormControlLabel,
  FormGroup,
  IconButton,
  Popover,
  Slide,
  type SlideProps,
  Snackbar,
  Switch,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import ScaleLine from 'ol/control/ScaleLine.js';
import WMSCapabilities from 'ol/format/WMSCapabilities.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import TileLayer from 'ol/layer/Tile.js';
import OpenLayersMap from 'ol/Map.js';
import { fromLonLat, transform } from 'ol/proj.js';
import TileWMS from 'ol/source/TileWMS.js';
import View from 'ol/View.js';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoadLocation } from '../../../utils/validateRoadLocation';
import { visuallyHidden } from '../visuallyHidden';
import { MapAddressSearch } from './MapAddressSearch';
import { RoadLocationDialog } from './RoadLocationDialog';
import { roadDataAttribution, roadReferenceLayerName } from './roadData';
import { useRoadSelection } from './useRoadSelection';
import 'ol/ol.css';

const token = import.meta.env.VITE_DATAFORSYNINGEN_TOKEN ?? '';
const wmsUrl = 'https://api.dataforsyningen.dk/wms/forvaltning2';
const wmsVersion = '1.1.1';
const mapProjection = 'EPSG:3857';
const errorToastDuration = 5000;
type MapError = 'unavailable' | 'overlayError' | 'fullscreenError';

/** Slides the toast in from the left edge of the viewport. */
function MapErrorSlide(props: SlideProps) {
  return <Slide {...props} direction="right" />;
}

/** Shows a map error and pauses its five-second countdown on hover. */
function MapErrorToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [hovered, setHovered] = useState(false);
  const remaining = useRef(errorToastDuration);

  useEffect(() => {
    if (hovered) return;

    const started = Date.now();
    const timeout = window.setTimeout(onDismiss, remaining.current);
    return () => {
      window.clearTimeout(timeout);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - started),
      );
    };
  }, [hovered, onDismiss]);

  return (
    <Snackbar
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      onClose={(_, reason) => {
        if (reason === 'escapeKeyDown') onDismiss();
      }}
      open
      slots={{ transition: MapErrorSlide }}
      transitionDuration={reduceMotion ? 0 : undefined}
    >
      <Alert
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        severity="error"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          pb: 1.5,
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 'auto 0 0',
            height: 3,
            bgcolor: 'currentColor',
            transformOrigin: 'left',
            animation: `mapErrorCountdown ${errorToastDuration}ms linear forwards`,
            animationPlayState: hovered ? 'paused' : 'running',
          },
          '@keyframes mapErrorCountdown': {
            to: { transform: 'scaleX(0)' },
          },
          '@media (prefers-reduced-motion: reduce)': {
            '&::after': { animation: 'none' },
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

const baseLayerName = 'Basis_kort';
const labelLayers = {
  streetNames: 'Vejnavne_basiskort',
  houseNumbers: 'Husnummer',
  placeNames: 'Stednavne_basiskort',
} as const;
const defaultLayers = ['streetNames', 'houseNumbers'] as const;

const catalogLayers = {
  parcels: /^(matrikel\s*[-–]?\s*geometri|matrikelskel\s+geometri)(?:,|$)/i,
  municipalBoundaries: /^(?:dagi\s+)?kommune(?:gr(?:æ|ae|a)nser?|inddeling)\b/i,
  traffic: /^tema\s+trafik\b/i,
  hydrography: /^tema\s+hydro\b/i,
  nature: /^tema\s+natur\b/i,
  infrastructure: /^tema\s+teknik\b/i,
};

const roadOverlays = [
  {
    id: 'kilometerMarkers',
    url: 'https://geocloud.vd.dk/vejman-stamdata/wms',
    name: 'km-maerker',
  },
  {
    id: 'roadReferenceLines',
    url: 'https://geocloud.vd.dk/vrd/wms',
    name: roadReferenceLayerName,
  },
] as const;

type CatalogLayerId = keyof typeof catalogLayers;
type RoadOverlayId = (typeof roadOverlays)[number]['id'];
type LayerId = keyof typeof labelLayers | CatalogLayerId | RoadOverlayId;

type WmsLayer = {
  Name?: string;
  Title?: string;
  CRS?: string[];
  SRS?: string[];
  Layer?: WmsLayer[];
};

/** Resolves configured overlay IDs to the names advertised by the WMS layer catalog. */
function readLayerNames(xml: string) {
  const capabilities = new WMSCapabilities().read(xml) as {
    Capability?: { Layer?: WmsLayer };
  } | null;
  const root = capabilities?.Capability?.Layer;
  if (!root) throw new Error('Missing WMS layer catalog');

  const entries: { name: string; title: string }[] = [];
  /** Walks the WMS layer tree and retains layers that support the map projection directly or by inheritance. */
  function collect(layer: WmsLayer, inheritsProjection: boolean) {
    const supportsProjection =
      inheritsProjection ||
      [...(layer.CRS ?? []), ...(layer.SRS ?? [])].some((projection) =>
        projection.split(/\s+/).includes(mapProjection),
      );

    if (layer.Name && supportsProjection) {
      entries.push({
        name: layer.Name,
        title: (layer.Title ?? '').replace(/^[-–—]\s+/, ''),
      });
    }

    for (const child of layer.Layer ?? []) {
      collect(child, supportsProjection);
    }
  }

  collect(root, false);

  const names: Partial<Record<CatalogLayerId, string>> = {};
  for (const id of Object.keys(catalogLayers) as CatalogLayerId[]) {
    const pattern = catalogLayers[id];
    const match = entries.find(
      ({ name, title }) =>
        pattern.test(title) || pattern.test(name.replaceAll('_', ' ')),
    );
    if (match) names[id] = match.name;
  }

  // Some catalogs publish municipal boundaries in the administrative group.
  const administrativeGroup = entries.find(({ title }) =>
    /^dagi\s*[-–]\s*adm(?:\.|inistrative)/i.test(title),
  );
  if (!names.municipalBoundaries && administrativeGroup) {
    names.municipalBoundaries = administrativeGroup.name;
  }

  return names;
}

type DataforsyningenMapProps = {
  onRoadLocationConfirm: (location: RoadLocation) => void;
};

/** Renders the permit map, overlay controls, address search, and road drawing confirmation. */
export function DataforsyningenMap({
  onRoadLocationConfirm,
}: DataforsyningenMapProps) {
  const { t } = useTranslation();
  const controlsRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OpenLayersMap>(null);
  const viewRef = useRef<View>(null);
  const tileLayerRef = useRef<TileLayer<TileWMS>>(null);
  const roadLayersRef = useRef<
    { id: RoadOverlayId; layer: TileLayer<TileWMS> }[]
  >([]);
  const [layersAnchor, setLayersAnchor] = useState<HTMLButtonElement | null>(
    null,
  );
  const {
    drawingRoad,
    cancelDrawnRoad,
    confirmDrawnRoad,
    drawnRoad,
    hasSelection,
    layer: roadSelectionLayer,
    redrawRoad,
    setDrawingRoad,
    status: roadSelectionStatus,
  } = useRoadSelection(mapRef);
  const [layerCatalog, setLayerCatalog] = useState<ReturnType<
    typeof readLayerNames
  > | null>(null);
  const [enabledLayers, setEnabledLayers] = useState<LayerId[]>([
    ...defaultLayers,
  ]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapError, setMapError] = useState<MapError | null>(
    token ? null : 'unavailable',
  );
  const reportedTileErrors = useRef(new Set<MapError>());

  /** Clears the current map error toast. */
  const dismissMapError = useCallback(() => setMapError(null), []);

  const mapErrorMessages = {
    unavailable: t('permit.map.unavailable'),
    overlayError: t('permit.map.overlayError'),
    fullscreenError: t('permit.map.fullscreenError'),
  };
  const helpId = useId();
  const layersId = useId();
  const layersHeadingId = useId();
  const layersOpen = Boolean(layersAnchor);
  const roadSelectionMessages = {
    zoomIn: t('permit.map.roadSelection.zoomIn'),
    loading: t('permit.map.roadSelection.loading'),
    noRoad: t('permit.map.roadSelection.noRoad'),
    error: t('permit.map.roadSelection.error'),
    drawEnd: t('permit.map.roadSelection.drawEnd'),
    noPath: t('permit.map.roadSelection.noPath'),
    drawn: t('permit.map.roadSelection.drawn'),
  };
  const roadSelectionMessage = roadSelectionStatus
    ? roadSelectionMessages[roadSelectionStatus]
    : undefined;
  const layerOptions = [
    { id: 'streetNames', label: t('permit.map.streetNamesLayer') },
    { id: 'houseNumbers', label: t('permit.map.houseNumbersLayer') },
    { id: 'parcels', label: t('permit.map.parcelsLayer') },
    { id: 'kilometerMarkers', label: t('permit.map.kilometerMarkersLayer') },
    {
      id: 'roadReferenceLines',
      label: t('permit.map.roadReferenceLinesLayer'),
    },
    { id: 'placeNames', label: t('permit.map.placeNamesLayer') },
    {
      id: 'municipalBoundaries',
      label: t('permit.map.municipalBoundariesLayer'),
    },
    { id: 'traffic', label: t('permit.map.trafficLayer') },
    { id: 'hydrography', label: t('permit.map.hydrographyLayer') },
    { id: 'nature', label: t('permit.map.natureLayer') },
    { id: 'infrastructure', label: t('permit.map.infrastructureLayer') },
  ] satisfies { id: LayerId; label: string }[];

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
    function reportTileFailure(error: MapError) {
      if (reportedTileErrors.current.has(error)) return;
      reportedTileErrors.current.add(error);
      setMapError(error);
    }

    /** Reports a base-map tile failure. */
    const reportTileError = () => reportTileFailure('unavailable');
    source.on('tileloaderror', reportTileError);
    /** Flags an optional road-overlay tile failure separately from the base map. */
    const reportOverlayError = () => reportTileFailure('overlayError');
    const roadLayers = roadOverlays.map(({ id, url, name }) => {
      const overlaySource = new TileWMS({
        url,
        params: {
          LAYERS: name,
          FORMAT: 'image/png',
          VERSION: wmsVersion,
          TRANSPARENT: true,
        },
        attributions: roadDataAttribution,
      });
      overlaySource.on('tileloaderror', reportOverlayError);
      return {
        id,
        layer: new TileLayer({ source: overlaySource, visible: false }),
      };
    });
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
      source.un('tileloaderror', reportTileError);
      tileLayerRef.current = null;
      for (const { layer } of roadLayers) {
        layer.getSource()?.un('tileloaderror', reportOverlayError);
      }
      roadLayersRef.current = [];
      mapRef.current = null;
      map.dispose();
    };
  }, [roadSelectionLayer]);

  useEffect(() => {
    const source = tileLayerRef.current?.getSource();
    const names = { ...layerCatalog, ...labelLayers };
    const layerNames = [
      baseLayerName,
      ...Object.entries(names)
        .filter(([id]) => enabledLayers.includes(id as LayerId))
        .map(([, name]) => name),
    ].join(',');

    if (source && source.getParams().LAYERS !== layerNames) {
      source.updateParams({ LAYERS: layerNames });
    }

    for (const { id, layer } of roadLayersRef.current) {
      layer.setVisible(enabledLayers.includes(id));
    }
  }, [enabledLayers, layerCatalog]);

  useEffect(() => {
    if (!layersOpen || layerCatalog !== null) return;

    const controller = new AbortController();
    const url = new URL(wmsUrl);
    url.search = new URLSearchParams({
      token,
      SERVICE: 'WMS',
      VERSION: wmsVersion,
      REQUEST: 'GetCapabilities',
    }).toString();

    /** Fetches overlay names on demand and ignores results from cancelled requests. */
    async function loadLayers() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Could not load WMS layer catalog');
        const catalog = readLayerNames(await response.text());
        if (!controller.signal.aborted) setLayerCatalog(catalog);
      } catch {
        if (!controller.signal.aborted) setLayerCatalog({});
      }
    }

    void loadLayers();
    return () => controller.abort();
  }, [layersOpen, layerCatalog]);

  useEffect(() => {
    /** Keeps the fullscreen button in sync with the browser's fullscreen state. */
    const updateFullscreen = () =>
      setIsFullscreen(document.fullscreenElement === controlsRef.current);

    document.addEventListener('fullscreenchange', updateFullscreen);
    return () =>
      document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  /** Renders a toggle and disables it when its layer is absent from the catalog. */
  function renderLayerSwitch({ id, label }: (typeof layerOptions)[number]) {
    const disabled =
      id in catalogLayers && !layerCatalog?.[id as CatalogLayerId];

    return (
      <FormControlLabel
        control={
          <Switch
            checked={enabledLayers.includes(id)}
            disabled={disabled}
            onChange={(event) => {
              const { checked } = event.target;
              reportedTileErrors.current.clear();
              setEnabledLayers((previous) =>
                checked
                  ? [...previous, id]
                  : previous.filter((layer) => layer !== id),
              );
            }}
            size="small"
            slotProps={{ input: { role: 'switch' } }}
          />
        }
        key={id}
        label={label}
        slotProps={{ typography: { variant: 'body2' } }}
        sx={{ m: 0, minHeight: 36, gap: 1 }}
      />
    );
  }

  /** Enters or exits fullscreen and shows a toast if the browser rejects it. */
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === controlsRef.current) {
        await document.exitFullscreen();
      } else {
        await controlsRef.current?.requestFullscreen();
      }
    } catch {
      setMapError('fullscreenError');
    }
  }

  return (
    <Box>
      {token && (
        <Typography id={helpId} sx={{ mb: 1 }} variant="body2">
          {drawingRoad
            ? t('permit.map.roadSelection.drawHelp')
            : t('permit.map.help')}
        </Typography>
      )}
      <Box
        ref={controlsRef}
        sx={{
          position: 'relative',
          width: '100%',
          height: { xs: 420, sm: 640 },
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#F7F9FC',
          boxShadow: '0 8px 8px 0 grey',
          '&:fullscreen': { height: '100vh', borderRadius: 0 },
          '& .MuiIconButton-root': {
            bgcolor: 'background.paper',
            boxShadow: 1,
          },
        }}
      >
        {token && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 1,
              p: 1,
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, max-content)',
                gap: 0.5,
                flexShrink: 0,
                '& > .MuiIconButton-root:not(.Mui-disabled)': {
                  pointerEvents: 'auto',
                },
              }}
            >
              <IconButton
                aria-label={t('permit.map.zoomIn')}
                onClick={() => viewRef.current?.adjustZoom(1)}
                size="small"
                title={t('permit.map.zoomIn')}
              >
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label={t('permit.map.roadSelection.drawRoad')}
                aria-pressed={drawingRoad}
                color="primary"
                onClick={() => {
                  setDrawingRoad(!drawingRoad);
                  if (!drawingRoad)
                    targetRef.current?.focus({ preventScroll: true });
                }}
                size="small"
                sx={{
                  outline: drawingRoad ? '2px solid' : undefined,
                  outlineColor: 'primary.main',
                }}
                title={t('permit.map.roadSelection.drawRoad')}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label={t('permit.map.roadSelection.redrawRoad')}
                color="primary"
                disabled={!drawingRoad && !hasSelection}
                onClick={() => {
                  redrawRoad();
                  targetRef.current?.focus({ preventScroll: true });
                }}
                size="small"
                title={t('permit.map.roadSelection.redrawRoad')}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label={t('permit.map.zoomOut')}
                onClick={() => viewRef.current?.adjustZoom(-1)}
                size="small"
                sx={{ gridColumn: 1 }}
                title={t('permit.map.zoomOut')}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-controls={layersOpen ? layersId : undefined}
                aria-expanded={layersOpen}
                aria-haspopup="dialog"
                aria-label={t('permit.map.layers')}
                color="primary"
                onClick={(event) => {
                  if (layerCatalog && !Object.keys(layerCatalog).length) {
                    setLayerCatalog(null);
                  }
                  setLayersAnchor(event.currentTarget);
                }}
                size="small"
                sx={{ gridColumn: 1 }}
                title={t('permit.map.layers')}
              >
                <LayersOutlinedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                minWidth: 0,
                pointerEvents: 'auto',
              }}
            >
              <MapAddressSearch
                onLocate={(point) => {
                  // For map navigation, ETRS89 UTM 32N can use the WGS84 UTM 32N transform.
                  const center = transform(point, 'EPSG:32632', mapProjection);
                  const view = viewRef.current;
                  view?.setCenter(center);
                  view?.setZoom(Math.max(view.getZoom() ?? 0, 17));
                }}
              />
              {document.fullscreenEnabled && (
                <IconButton
                  aria-label={
                    isFullscreen
                      ? t('permit.map.exitFullscreen')
                      : t('permit.map.enterFullscreen')
                  }
                  color="primary"
                  onClick={toggleFullscreen}
                  sx={{ flexShrink: 0 }}
                >
                  {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              )}
            </Box>
            <Popover
              anchorEl={layersAnchor}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              container={() => controlsRef.current}
              onClose={() => setLayersAnchor(null)}
              open={layersOpen}
              slotProps={{
                paper: {
                  'aria-labelledby': layersHeadingId,
                  'aria-modal': true,
                  id: layersId,
                  role: 'dialog',
                  sx: {
                    p: 1.5,
                    mt: 0.5,
                    width: 280,
                    maxHeight: 'min(360px, calc(100dvh - 32px))',
                    overflowY: 'auto',
                  },
                },
              }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
              <Typography
                id={layersHeadingId}
                sx={{ mb: 1 }}
                variant="subtitle1"
              >
                {t('permit.map.layers')}
              </Typography>
              <FormGroup>{layerOptions.map(renderLayerSwitch)}</FormGroup>
              <Typography sx={{ mt: 0.5 }} variant="body2">
                {t('permit.map.layersZoomHint')}
              </Typography>
              <Typography role="status" variant="body2">
                {layerCatalog === null && t('permit.map.layersLoading')}
                {layerCatalog &&
                  Object.keys(layerCatalog).length <
                    Object.keys(catalogLayers).length &&
                  t('permit.map.layersUnavailable')}
              </Typography>
            </Popover>
          </Box>
        )}
        <Box
          aria-describedby={helpId}
          aria-label={t('permit.map.title')}
          hidden={!token}
          onMouseEnter={(event) => {
            event.currentTarget.focus({preventScroll: true});
          }}
          ref={targetRef}
          role="region"
          sx={{
            width: '100%',
            height: '100%',
            cursor: drawingRoad ? 'crosshair' : undefined,
            '#root &:focus-visible': { outlineOffset: '-4px' },
            '&:focus-visible + .road-selection-crosshair': { display: 'block' },
          }}
          tabIndex={token ? 0 : undefined}
        />
        {drawingRoad && (
          <AddIcon
            className="road-selection-crosshair"
            sx={{
              display: 'none',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 16,
              color: 'text.primary',
              filter: 'drop-shadow(0 0 2px white)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}
        <Box
          role="status"
          sx={{
            position: 'absolute',
            bottom: 34,
            insetInline: 8,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {roadSelectionMessage && (
            <Typography
              sx={
                roadSelectionStatus === 'drawn'
                  ? visuallyHidden
                  : {
                      px: 1.5,
                      py: 0.5,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                    }
              }
              variant="body2"
            >
              {roadSelectionMessage}
            </Typography>
          )}
        </Box>
        {mapError && (
          <MapErrorToast
            key={mapError}
            message={mapErrorMessages[mapError]}
            onDismiss={dismissMapError}
          />
        )}
        {drawnRoad && (
          <RoadLocationDialog
            container={() => controlsRef.current}
            onClose={cancelDrawnRoad}
            onConfirm={(location) => {
              confirmDrawnRoad();
              onRoadLocationConfirm(location);
            }}
            suggestedLocation={drawnRoad.location}
          />
        )}
      </Box>
    </Box>
  );
}
