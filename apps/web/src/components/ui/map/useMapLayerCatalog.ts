import { useEffect, useState } from 'react';
import { loadMapLayerCatalog, type MapLayerCatalog } from './mapLayers';

type LayerCatalogStatus =
  | { status: 'loading' }
  | { status: 'loaded'; catalog: MapLayerCatalog }
  | { status: 'failed' };

const catalogTimeout = 5000;

export function useMapLayerCatalog(open: boolean) {
  const [layerCatalog, setLayerCatalog] = useState<LayerCatalogStatus>({
    status: 'loading',
  });

  useEffect(() => {
    if (!open || layerCatalog.status !== 'loading') return;
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(catalogTimeout),
    ]);
    void loadMapLayerCatalog(signal).then(
      (catalog) => {
        if (!controller.signal.aborted) {
          setLayerCatalog({ status: 'loaded', catalog });
        }
      },
      () => {
        if (!controller.signal.aborted) setLayerCatalog({ status: 'failed' });
      },
    );
    return () => controller.abort();
  }, [open, layerCatalog.status]);

  return {
    layerCatalog,
    retry: () => setLayerCatalog({ status: 'loading' }),
  };
}
