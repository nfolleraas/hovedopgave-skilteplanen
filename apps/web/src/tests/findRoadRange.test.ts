// @vitest-environment node
import Feature from 'ol/Feature.js';
import LineString from 'ol/geom/LineString.js';
import { fromLonLat } from 'ol/proj.js';
import { describe, expect, it, vi } from 'vitest';
import { findRoadName } from '../components/ui/map/findRoadName';
import { findRoadRange } from '../components/ui/map/findRoadRange';
import { getAddressData } from '../utils/adressevaelger';

vi.mock('../utils/adressevaelger');
vi.mock('../components/ui/map/findRoadName');

const endpoints = [
  [10.38, 55.4],
  [10.39, 55.4],
];
const projection = 'EPSG:3857';
const road = new Feature({
  vejgeometrikommunekode: '0461',
  vejgeometrivejkode: '0106',
});
const line = new LineString(endpoints.map((point) => fromLonLat(point)));

/** Stubs address responses at both endpoints and allows the second address to differ by district or road. */
function resolveRange(endPostcode = '5000', endRoadCode = '0106') {
  vi.mocked(findRoadName).mockResolvedValue('Adamsgade');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL) => {
      const west = Number(url.searchParams.get('bbox')?.split(',')[0]);
      const index = west < 10.385 ? 0 : 1;
      return Response.json({
        features: [
          {
            geometry: { coordinates: endpoints[index] },
            properties: {
              inspireid: String(index),
              component_thoroughfarename: 'street',
              status: 'current',
            },
          },
        ],
      });
    }),
  );
  vi.mocked(getAddressData).mockImplementation(async (id) => {
    const end = id === '1';
    return {
      husnummer: {
        vejnavn: end && endRoadCode !== '0106' ? 'Nearby road' : 'Adamsgade',
        husnummertekst: end ? '5A' : '31',
        postnummer: end
          ? {
              postnr: endPostcode,
              navn: endPostcode === '5000' ? 'Odense C' : 'Odense V',
            }
          : { postnr: '5000', navn: 'Odense C' },
        navngivenvejkommunedel: {
          kommune: '0461',
          vejkode: end ? endRoadCode : '0106',
        },
      },
    };
  });
  return findRoadRange(road, line, projection, new AbortController().signal);
}

describe('Map address suggestions', () => {
  it('orders the house numbers and returns the matching postal district', async () => {
    await expect(resolveRange()).resolves.toEqual({
      road: 'Adamsgade',
      houseNumberFrom: '5A',
      houseNumberTo: '31',
      postalCode: '5000',
      city: 'Odense C',
    });
  });

  it('leaves postal code and city blank when the endpoints disagree', async () => {
    await expect(resolveRange('5200')).resolves.toMatchObject({
      houseNumberFrom: '5A',
      houseNumberTo: '31',
      postalCode: '',
      city: '',
    });
  });

  it('does not suggest a house-number range using an address on another road', async () => {
    await expect(resolveRange('5200', '9999')).resolves.toEqual({
      road: 'Adamsgade',
      houseNumberFrom: '',
      houseNumberTo: '',
      postalCode: '5000',
      city: 'Odense C',
    });
  });
});
