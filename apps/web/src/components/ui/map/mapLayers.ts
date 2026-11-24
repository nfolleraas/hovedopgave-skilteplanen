import WMSCapabilities from 'ol/format/WMSCapabilities.js';
import { roadReferenceLayerName } from './roadData';

export const token =
  import.meta.env.VITE_DATAFORSYNINGEN_PUBLISHABLE_TOKEN ?? '';
export const wmsUrl = 'https://api.dataforsyningen.dk/wms/forvaltning2';
export const wmsVersion = '1.1.1';
export const mapProjection = 'EPSG:3857';

export const baseLayerName = 'Basis_kort';
export const labelLayers = {
  streetNames: 'Vejnavne_basiskort',
  houseNumbers: 'Husnummer',
  placeNames: 'Stednavne_basiskort',
} as const;
export const defaultLayers = ['streetNames', 'houseNumbers'] as const;

export const catalogLayers = {
  parcels: /^(matrikel\s*[-–]?\s*geometri|matrikelskel\s+geometri)(?:,|$)/i,
  municipalBoundaries: /^(?:dagi\s+)?kommune(?:gr(?:æ|ae|a)nser?|inddeling)\b/i,
  traffic: /^tema\s+trafik\b/i,
  hydrography: /^tema\s+hydro\b/i,
  nature: /^tema\s+natur\b/i,
  infrastructure: /^tema\s+teknik\b/i,
};

export const roadOverlays = [
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

export type CatalogLayerId = keyof typeof catalogLayers;
export type RoadOverlayId = (typeof roadOverlays)[number]['id'];
export type LayerId = keyof typeof labelLayers | CatalogLayerId | RoadOverlayId;

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

export async function loadMapLayerCatalog(signal: AbortSignal) {
  const url = new URL(wmsUrl);
  url.search = new URLSearchParams({
    token,
    SERVICE: 'WMS',
    VERSION: wmsVersion,
    REQUEST: 'GetCapabilities',
  }).toString();

  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Could not load WMS layer catalog');
  return readLayerNames(await response.text());
}

export type MapLayerCatalog = Awaited<ReturnType<typeof loadMapLayerCatalog>>;
