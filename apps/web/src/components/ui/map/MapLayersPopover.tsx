import {
  Alert,
  Button,
  FormControlLabel,
  FormGroup,
  Popover,
  Switch,
  Typography,
} from '@mui/material';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type CatalogLayerId,
  catalogLayers,
  type LayerId,
  type MapLayerCatalog,
} from './mapLayers';

type MapLayersPopoverProps = {
  /** The layers button. The popover is open while it is set. */
  anchor: HTMLButtonElement | null;
  container: () => HTMLElement | null;
  id: string;
  catalogStatus: 'loading' | 'loaded' | 'failed';
  catalog: MapLayerCatalog | undefined;
  enabledLayers: LayerId[];
  onLayerChange: (id: LayerId, enabled: boolean) => void;
  onRetry: () => void;
  onClose: () => void;
};

/** Lets the user turn the map's extra layers on and off. */
export function MapLayersPopover({
  anchor,
  container,
  id,
  catalogStatus,
  catalog,
  enabledLayers,
  onLayerChange,
  onRetry,
  onClose,
}: MapLayersPopoverProps) {
  const { t } = useTranslation();
  const layersHeadingId = useId();
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

  /** Renders a toggle and disables it when its layer is absent from the catalog. */
  function renderLayerSwitch({ id, label }: (typeof layerOptions)[number]) {
    const disabled = id in catalogLayers && !catalog?.[id as CatalogLayerId];

    return (
      <FormControlLabel
        control={
          <Switch
            checked={enabledLayers.includes(id)}
            disabled={disabled}
            onChange={(event) => onLayerChange(id, event.target.checked)}
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

  return (
    <Popover
      anchorEl={anchor}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      container={container}
      onClose={onClose}
      open={Boolean(anchor)}
      slotProps={{
        paper: {
          'aria-labelledby': layersHeadingId,
          'aria-modal': true,
          id,
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
      <Typography id={layersHeadingId} sx={{ mb: 1 }} variant="subtitle1">
        {t('permit.map.layers')}
      </Typography>
      <FormGroup>{layerOptions.map(renderLayerSwitch)}</FormGroup>
      <Typography sx={{ mt: 0.5 }} variant="body2">
        {t('permit.map.layersZoomHint')}
      </Typography>
      {catalogStatus === 'failed' ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {t('permit.map.layersLoadError')}
          <Button
            color="inherit"
            onClick={onRetry}
            sx={{ display: 'block', minHeight: 44, mt: 0.5 }}
          >
            {t('permit.map.layersRetry')}
          </Button>
        </Alert>
      ) : (
        <Typography role="status" variant="body2">
          {catalogStatus === 'loading' && t('permit.map.layersLoading')}
          {catalog &&
            Object.keys(catalog).length < Object.keys(catalogLayers).length &&
            t('permit.map.layersUnavailable')}
        </Typography>
      )}
    </Popover>
  );
}
