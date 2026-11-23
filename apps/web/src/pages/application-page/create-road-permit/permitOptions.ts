import type { TFunction } from 'i18next';

/** Maps stored material values to translated labels. */
export function getMaterialTypes(t: TFunction) {
  return {
    Banner: t('permit.materials.banner'),
    TemporarySign: t('permit.materials.temporarySign'),
    PermanentSign: t('permit.materials.permanentSign'),
    DrillingRig: t('permit.materials.drillingRig'),
    Container: t('permit.materials.container'),
    Crane: t('permit.materials.crane'),
    Truck: t('permit.materials.truck'),
    Lift: t('permit.materials.lift'),
    OfficeCabin: t('permit.materials.officeCabin'),
    WelfareCabin: t('permit.materials.welfareCabin'),
    TrenchlessUnit: t('permit.materials.trenchlessUnit'),
    ReliningUnit: t('permit.materials.reliningUnit'),
    Scaffolding: t('permit.materials.scaffolding'),
    LoadingTower: t('permit.materials.loadingTower'),
    Tent: t('permit.materials.tent'),
    Stage: t('permit.materials.stage'),
    Grandstand: t('permit.materials.grandstand'),
    Other: t('permit.materials.other'),
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
export function getTrafficChangeLabels(t: TFunction) {
  return {
    SpeedLimitWorkZone: t('permit.roadMarking.speedWorkers'),
    SpeedLimitTrafficSafety: t('permit.roadMarking.speedRoadUsers'),
    SpeedLimitWorkZoneAndTrafficSafety: t('permit.roadMarking.speedBoth'),
    UnconditionalObligationInIntersection: t('permit.roadMarking.giveWay'),
    NoStoppingAndParking: t('permit.roadMarking.parking'),
    OnewayTraffic: t('permit.roadMarking.oneWay'),
  } as Record<string, string>;
}
