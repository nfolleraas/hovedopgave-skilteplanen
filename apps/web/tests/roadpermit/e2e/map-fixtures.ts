import type { Page } from '@playwright/test';
import { transform } from 'ol/proj.js';

const transparentTile = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0WQAAAAASUVORK5CYII=',
  'base64',
);
const cors = { 'access-control-allow-origin': '*' };
const addressPoint = [587000, 6142000];
const [x, y] = transform(addressPoint, 'EPSG:32632', 'EPSG:3857');
const road = 'Parkvej';
const postalCode = '5260';
const city = 'Odense S';
const municipalityCode = '0461';
const roadCode = '1234';
export const mapAddress = 'Parkvej 12, 5260 Odense S';

export async function mockMapServices(page: Page) {
  await page.route(
    'https://api.dataforsyningen.dk/wms/forvaltning2?*',
    (route) =>
      route.fulfill({
        body: transparentTile,
        contentType: 'image/png',
        headers: cors,
      }),
  );
  await page.route('https://adressevaelger.dk/husnumre/soeg?*', (route) => {
    const params = new URL(route.request().url()).searchParams;
    const roadsOnly = params.get('maal') === 'navngivenvejpostnummer';
    return route.fulfill({
      headers: cors,
      json: {
        status: 'ok',
        fund: roadsOnly
          ? [
              {
                type: 'navngivenvejpostnummer',
                vejnavn: road,
                postnr: postalCode,
                postdistrikt: city,
              },
              {
                type: 'navngivenvejpostnummer',
                vejnavn: road,
                postnr: '2750',
                postdistrikt: 'Ballerup',
              },
            ]
          : [{ type: 'husnummer', id: 'map-center', titel: mapAddress }],
      },
    });
  });
  await page.route('https://adressevaelger.dk/husnumre/map-center?*', (route) =>
    route.fulfill({
      headers: cors,
      json: {
        husnummer: {
          adgangspunkt: { geometri: { coordinates: addressPoint } },
        },
      },
    }),
  );

  // The map centers on the address above. This line runs through both selected points.
  await page.route('https://geocloud.vd.dk/vrd/wfs?*', (route) =>
    route.fulfill({
      headers: cors,
      json: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [x - 180, y],
                [x + 180, y],
              ],
            },
            properties: {
              vejgeometrikommunekode: municipalityCode,
              vejgeometrivejkode: roadCode,
            },
          },
        ],
      },
    }),
  );
  await page.route('https://geocloud.vd.dk/vejman-stamdata/wfs?*', (route) =>
    route.fulfill({
      headers: cors,
      json: {
        features: [
          {
            properties: {
              CPR_VEJKODE: Number(municipalityCode + roadCode),
              CPR_VEJNAVN: road,
            },
          },
        ],
      },
    }),
  );
  await page.route(
    'https://api.dataforsyningen.dk/ogcapi/features/ad_inspire/collections/address/items?*',
    (route) =>
      route.fulfill({
        headers: cors,
        json: {
          features: [
            { number: '12', offset: -72 },
            { number: '20', offset: 72 },
          ].map(({ number, offset }) => ({
            geometry: {
              coordinates: transform([x + offset, y], 'EPSG:3857', 'EPSG:4326'),
            },
            properties: {
              inspireid: `parkvej-${number}`,
              component_thoroughfarename: road,
              status: 'current',
            },
          })),
        },
      }),
  );
  for (const houseNumber of ['12', '20']) {
    await page.route(
      `https://adressevaelger.dk/husnumre/parkvej-${houseNumber}?*`,
      (route) =>
        route.fulfill({
          headers: cors,
          json: {
            husnummer: {
              vejnavn: road,
              husnummertekst: houseNumber,
              postnummer: { postnr: postalCode, navn: city },
              navngivenvejkommunedel: {
                kommune: municipalityCode,
                vejkode: roadCode,
              },
            },
          },
        }),
    );
  }
}
