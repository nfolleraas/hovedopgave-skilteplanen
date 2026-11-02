# Domain Glossary

Danish translations of the domain names declared in the Prisma schema. The English names are the identifiers used in code; the Danish terms are their domain-language equivalents.

## Domain Models

| English name | Danish translation |
| --- | --- |
| `Actor` | Aktør |
| `Address` | Adresse |
| `Administrator` | Administrator |
| `Applicant` | Ansøger |
| `Application` | Ansøgning |
| `Area` | Område |
| `AreaDetail` | Områdedetalje |
| `AreaSize` | Områdestørrelse |
| `CableTask` | Ledningsopgave |
| `CaseWorker` | Sagsbehandler |
| `ContactPerson` | Kontaktperson |
| `Document` | Dokument |
| `ExcavationPermit` | Gravetilladelse |
| `Feedback` | Feedback |
| `Material` | Materiel |
| `Message` | Besked |
| `MessageThread` | Beskedtråd |
| `Municipality` | Kommune |
| `Notification` | Notifikation |
| `Permission` | Tilladelse |
| `RoadUsePermit` | Råden over vej (ROV) |
| `SignPlan` | Skilteplan |
| `TrafficCalmingMeasure` | Trafikforanstaltninger |

## Enums and Values

### `ApplicantType` — Ansøgertype

| English value | Danish translation |
| --- | --- |
| `Private` | Privatperson |
| `Business` | Virksomhed |

### `ApplicationType` — Ansøgningstype

| English value | Danish translation |
| --- | --- |
| `ExcavationPermit` | Gravetilladelse |
| `RoadUsePermit` | Råden over vej |
| `RoadUsePermitEvent` | Råden over vej til arrangement |

### `Availability` — Tilgængelighed

| English value | Danish translation |
| --- | --- |
| `Day` | Dag |
| `Evening` | Aften |
| `Night` | Nat |
| `AllDay` | Hele dagen |

### `CableSubtype` — Ledningsnetdel

| English value | Danish translation |
| --- | --- |
| `MainLine` | Hovedledning |
| `ServiceLine` | Stikledning |
| `StreetCabinet` | Kabelskab |
| `Other` | Andet |

### `CableType` — Ledningstype

| English value | Danish translation |
| --- | --- |
| `Telephone` | Telefon |
| `Water` | Vand |
| `Power` | El |
| `Sewage` | Kloak |
| `Gas` | Gas |
| `DistrictHeating` | Fjernvarme |
| `Coax` | Antenne |
| `Fiber` | Fiber |
| `Other` | Andet |

### `DocumentType` — Dokumenttype

| English value | Danish translation |
| --- | --- |
| `SignPlan` | Skilteplan |
| `Other` | Andet |

### `Direction` — Retning

| English value | Danish translation |
| --- | --- |
| `Along` | På langs |
| `Across` | På tværs |

### `ExecutionMethod` — Udførelsesmetode

| English value | Danish translation |
| --- | --- |
| `Excavation` | Gravning |
| `ExistingPipe` | Eksisterende rør |
| `Ploughing` | Pløjning |
| `ChainTrenching` | Kædegravning |
| `SoilDisplacement` | Jordfortrængning |
| `PipeCracking` | Rørcracking |
| `PipeRamming` | Rørunderpresning |
| `UndergroundDrilling` | Underboring |
| `UndergroundDirectionalDrilling` | Styret underboring |
| `Other` | Andet |

### `MaterialType` — Materieltype

| English value | Danish translation |
| --- | --- |
| `Banner` | Banner |
| `TemporarySign` | Midlertidigt skilt |
| `PermanentSign` | Permanent skilt |
| `DrillingRig` | Borerig |
| `Container` | Container |
| `Crane` | Kran |
| `Truck` | Lastbil |
| `Lift` | Lift |
| `OfficeCabin` | Kontorvogn |
| `WelfareCabin` | Skurvogn |
| `TrenchlessUnit` | No dig anlæg |
| `ReliningUnit` | Relining anlæg |
| `Scaffolding` | Stillads |
| `LoadingTower` | Ladetårn |
| `Tent` | Telt |
| `Stage` | Scene |
| `Grandstand` | Tribune |
| `Other` | Andet |

### `PermitType` — Tilladelsestype

| English value | Danish translation |
| --- | --- |
| `Application` | Ansøgning |
| `Notice` | Anmeldelse |

### `QuestionType` — Spørgsmålstype

| English value | Danish translation |
| --- | --- |
| `ExcavationPermit` | Gravetilladelse |
| `RoadUsePermit` | Råden over vej |
| `RoadUsePermitEvent` | Råden over vej til arrangement |
| `Other` | Andet |

### `RoadSection` — Vejsektion

| English value | Danish translation |
| --- | --- |
| `Lane` | Kørebane |
| `EmergencyLane` | Nødspor |
| `BikeLane` | Cykelsti |
| `Pavement` | Fortov |
| `Roundabout` | Rundkørsel |
| `RoadVerge` | Vejrabat |
| `Other` | Andet |

### `RoadSide` — Vejside

| English value | Danish translation |
| --- | --- |
| `Left` | Venstre |
| `Right` | Højre |
| `Both` | Begge |
| `Middle` | Midten |

### `RoadOwnership` — Vejens ejerskab

| English value | Danish translation |
| --- | --- |
| `Private` | Privat |
| `Municipality` | Kommune |

### `SignPlanType` — Skilteplantype

| English value | Danish translation |
| --- | --- |
| `MarkingCityArea` | Afmærkningsplan i byområde |
| `MarkingHighway` | Afmærkningsplan på motorvej |
| `MarkingRuralArea` | Afmærkningsplan i åbent land |
| `AuthorityMarkingPlan` | Myndighedens afmærkningsplan |
| `AttachSpecificMarkingPlan` | Specifik afmærkningsplan vedhæftet |

### `ApplicationStatus` — Ansøgningsstatus
### `Status` — Ansøgningsstatus

| English value | Danish translation |
| --- | --- |
| `Draft` | Kladde |
| `InProgress` | Under behandling |
| `Approved` | Godkendt |
| `Rejected` | Afvist |
| `ChangeRequired` | Ændringer påkrævet |

### `TrafficCalmingMeasureType` — Trafikforanstaltningstype

| English value | Danish translation |
| --- | --- |
| `A` | A |
| `B` | B |
| `C` | C |
| `D` | D |
| `E` | E |
| `F` | F |
| `G` | G |
| `H` | H |
| `I` | I |


### `TrafficCalmingMeasureScope` — Trafikforanstaltningsvirkeområde

| English value | Danish translation |
| --- | --- |
| `OncomingTraffic` | Modkørende trafik |
| `FollowingTraffic` | Bagvedkørende trafik |
| `Both` | Begge retninger |

### `TrafficChange` — Trafikændring

| English value | Danish translation |
| --- | --- |
| `SpeedLimitWorkZone` | Hastighedsbegrænsning ved vejarbejde |
| `SpeedLimitTrafficSafety` | Hastighedsbegrænsning af hensyn til trafiksikkerhed |
| `OnewayTraffic` | Ensrettet trafik |
| `TrafficLight` | Trafiksignal |
| `NoStoppingAndParking` | Standsnings- og parkeringsforbud |
| `UnconditionalObligationInIntersection` | Ubetinget vigepligt i kryds |

### `Usage` — Anvendelse

| English value | Danish translation |
| --- | --- |
| `AsphaltWork` | Asfaltarbejde |
| `Construction` | Byggearbejde |
| `Renovation` | Renovering |
| `MaterialSpace` | Materialeoplag |
| `StreetFurnitureInstallation` | Opsætning af byrumsinventar |
| `BannerInstallation` | Banneropsætning |
| `SignInstallment` | Skiltopsætning |
| `MarketStand` | Stadeplads |
| `OutdoorServing` | Udendørsservering |
| `WaterDischarge` | Udledning af vand |
| `ProductDisplay` | Vareudstilling |
| `Other` | Andet |

### `WorkCategory` — Arbejdskategori

| English value | Danish translation |
| --- | --- |
| `Establishment` | Etablering |
| `Repair` | Reparation |
| `JointBay` | Splidsehul |
| `CableError` | Kabelfejl |
| `Renovation` | Renovering |
| `Decommission` | Afbrydelse |
| `AlarmError` | Alarmfejl |
| `Removal` | Fjernelse |
| `Cleaning` | Oprensning |
| `TrialHole` | Prøvehul |
| `Investigation` | Undersøgelse |
| `Other` | Andet |

### `ActorRole` — Aktørrolle

| English value | Danish translation |
| --- | --- |
| `Supplier` | Leverandør |
| `Contractor` | Entreprenør |
| `NetworkOperator` | Ledningsejer |
| `ProjectCoordinator` | Projektkoordinator |
| `Private` | Privatperson |
