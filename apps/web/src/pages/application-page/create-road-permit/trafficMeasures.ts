import type { TFunction } from 'i18next';

// Transcribed from the application's wireframe.
export type TrafficMeasure = {
  type: string;
  protection: string;
  scope: string;
  isSelected: boolean;
  description: string;
};

export const trafficMeasures: TrafficMeasure[] = [
  {
    type: 'A',
    protection: 'Ingen beskyttelsesgrad',
    scope: 'Begge',
    description:
      'Kantafmærkning eller baggrundsafmærkning (N 42, N 44, O 41,2, O 41,3, O 42, O 43, O 44 og O 45). O 45 kan være monteret på afmærkningsflade.',
    isSelected: false,
  },
  {
    type: 'B',
    protection: '1',
    scope: 'Begge',
    description: 'Spærring (lukning) af vejen',
    isSelected: false,
  },
  {
    type: 'C',
    protection: '2',
    scope: 'Forbipasserende trafik',
    description: 'Trafikværn, der afskærmer arbejdsstedet i længderetningen',
    isSelected: false,
  },
  {
    type: 'D',
    protection: '3',
    scope: 'Forbipasserende trafik',
    description:
      'Arbejdsfrit område ≥ 1,0 m inkl. bredde af kantafmærkning mellem arbejdssted og længdeafspærringen',
    isSelected: false,
  },
  {
    type: 'E',
    protection: '2',
    scope: 'Bagfrakommende trafik',
    description:
      'Påkørselsdæmper eller trafikværn der afskærmer arbejdsstedet i tværretningen',
    isSelected: false,
  },
  {
    type: 'F',
    protection: '2',
    scope: 'Bagfrakommende trafik',
    description:
      'Beskyttelsesmodul inklusive respektafstand fx køretøj eller maskine med en køreklar vægt ≥ 10,8 t eller hvor beskyttelsesmodul med en faktisk totalvægt ≥ 2 t hvor den aktuelle hastighed er 50 km/h eller lavere',
    isSelected: false,
  },
  {
    type: 'G',
    protection: '3',
    scope: 'Bagfrakommende trafik',
    description:
      'Arbejdsfrit område svarende til standselængden eller længere mellem arbejdssted og tværafspærring',
    isSelected: false,
  },
  {
    type: 'H',
    protection: '4',
    scope: 'Begge',
    description:
      'E 53,4 Område med fartdæmpning (Folk på vejen) med anbefalet hastighed 20 km/h og hastighedsdæmpende foranstaltninger',
    isSelected: false,
  },
  {
    type: 'I',
    protection: 'Ingen beskyttelsesgrad',
    scope: 'Begge',
    description: 'Ingen foranstaltninger',
    isSelected: false,
  },
];

/** Builds translated labels for traffic measures and their scope. */
export function getTrafficMeasureLabels(t: TFunction) {
  const descriptions: Record<string, string> = {
    A: t('permit.roadMarking.measureA'),
    B: t('permit.roadMarking.measureB'),
    C: t('permit.roadMarking.measureC'),
    D: t('permit.roadMarking.measureD'),
    E: t('permit.roadMarking.measureE'),
    F: t('permit.roadMarking.measureF'),
    G: t('permit.roadMarking.measureG'),
    H: t('permit.roadMarking.measureH'),
    I: t('permit.roadMarking.measureI'),
  };
  const scopes: Record<string, string> = {
    Begge: t('permit.roadMarking.scopeBoth'),
    'Forbipasserende trafik': t('permit.roadMarking.scopePassing'),
    'Bagfrakommende trafik': t('permit.roadMarking.scopeApproaching'),
  };

  return Object.fromEntries(
    trafficMeasures.map((measure) => [
      measure.type,
      {
        name: t('permit.roadMarking.measure', { type: measure.type }),
        description: descriptions[measure.type],
        protection:
          measure.protection === 'Ingen beskyttelsesgrad'
            ? t('permit.roadMarking.noProtection')
            : measure.protection,
        scope: scopes[measure.scope],
      },
    ]),
  );
}
