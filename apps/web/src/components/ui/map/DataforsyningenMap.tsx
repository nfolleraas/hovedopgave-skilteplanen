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
  Button,
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
import type OpenLayersMap from 'ol/Map.js';
import { transform } from 'ol/proj.js';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoadLocation } from '../../../utils/validateRoadLocation';
import { visuallyHidden } from '../visuallyHidden';
import { MapAddressSearch } from './MapAddressSearch';
import {
  type CatalogLayerId,
  catalogLayers,
  type LayerId,
  mapProjection,
  token,
} from './mapLayers';
import { RoadLocationDialog } from './RoadLocationDialog';
import { useDataforsyningenMap } from './useDataforsyningenMap';
import { useMapLayerCatalog } from './useMapLayerCatalog';
import { useRoadSelection } from './useRoadSelection';
import 'ol/ol.css';

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
  const layersOpen = Boolean(layersAnchor);
  const { layerCatalog, retry: retryLayerCatalog } =
    useMapLayerCatalog(layersOpen);
  const catalog =
    layerCatalog.status === 'loaded' ? layerCatalog.catalog : undefined;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapError, setMapError] = useState<MapError | null>(
    token ? null : 'unavailable',
  );
  const { viewRef, enabledLayers, setLayerEnabled } = useDataforsyningenMap({
    mapRef,
    targetRef,
    roadSelectionLayer,
    catalog,
    onTileError: setMapError,
  });

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
    /** Keeps the fullscreen button in sync with the browser's fullscreen state. */
    const updateFullscreen = () =>
      setIsFullscreen(document.fullscreenElement === controlsRef.current);

    document.addEventListener('fullscreenchange', updateFullscreen);
    return () =>
      document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  /** Renders a toggle and disables it when its layer is absent from the catalog. */
  function renderLayerSwitch({ id, label }: (typeof layerOptions)[number]) {
    const disabled = id in catalogLayers && !catalog?.[id as CatalogLayerId];

    return (
      <FormControlLabel
        control={
          <Switch
            checked={enabledLayers.includes(id)}
            disabled={disabled}
            onChange={(event) => setLayerEnabled(id, event.target.checked)}
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
                  if (layerCatalog.status === 'failed') retryLayerCatalog();
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
              {layerCatalog.status === 'failed' ? (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {t('permit.map.layersLoadError')}
                  <Button
                    color="inherit"
                    onClick={retryLayerCatalog}
                    sx={{ display: 'block', minHeight: 44, mt: 0.5 }}
                  >
                    {t('permit.map.layersRetry')}
                  </Button>
                </Alert>
              ) : (
                <Typography role="status" variant="body2">
                  {layerCatalog.status === 'loading' &&
                    t('permit.map.layersLoading')}
                  {catalog &&
                    Object.keys(catalog).length <
                      Object.keys(catalogLayers).length &&
                    t('permit.map.layersUnavailable')}
                </Typography>
              )}
            </Popover>
          </Box>
        )}
        <Box
          aria-describedby={helpId}
          aria-label={t('permit.map.title')}
          hidden={!token}
          onMouseEnter={(event) => {
            event.currentTarget.focus({ preventScroll: true });
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
