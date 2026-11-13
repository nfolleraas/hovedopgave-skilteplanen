import type { TFunction } from 'i18next';

/** Maps stored material values to translated labels. */
export function getMaterialTypes(t: TFunction) {
  return {
    Container: t('permit.materials.container'),
    Stillads: t('permit.materials.scaffolding'),
    Andet: t('permit.materials.other'),
  } as Record<string, string>;
}

/** Maps stored usage values to translated labels. */
export function getUsageTypes(t: TFunction) {
  return {
    Byggearbejde: t('permit.usage.construction'),
    Arrangement: t('permit.usage.event'),
    Andet: t('permit.usage.other'),
  } as Record<string, string>;
}

/** Maps stored traffic change values to translated labels. */
export function getTrafficChangeOptions(t: TFunction) {
  return {
    'Hastighedsbegrænsning - hensyn til vejarbejder': t(
      'permit.roadMarking.speedWorkers',
    ),
    'Hastighedsbegrænsning - hensyn til trafikanter': t(
      'permit.roadMarking.speedRoadUsers',
    ),
    'Hastighedsbegrænsning - hensyn til trafikanter og vejarbejdere': t(
      'permit.roadMarking.speedBoth',
    ),
    'Ubetinget vigepligt i vejkryds': t('permit.roadMarking.giveWay'),
    'Standsning og Parkering': t('permit.roadMarking.parking'),
    'Påbud om ensrettet færdsel': t('permit.roadMarking.oneWay'),
  } as Record<string, string>;
}
