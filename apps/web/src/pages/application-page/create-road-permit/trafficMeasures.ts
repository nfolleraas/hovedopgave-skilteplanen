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
