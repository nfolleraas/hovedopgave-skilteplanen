import type { Prisma } from '../../../generated/prisma/client.js';
import {
  ApplicantType,
  ApplicationType,
  Availability,
  MaterialType,
  TrafficCalmingMeasureScope,
  TrafficCalmingMeasureType,
  TrafficChange,
  Usage,
} from '../../../generated/prisma/enums.js';
import type { CreateRoadPermitDto } from '../dto/create-road-permit.dto.js';

const usageTypes: Record<string, Usage> = {
  Byggearbejde: Usage.Construction,
  Arrangement: Usage.Other,
  Andet: Usage.Other,
};

const materialTypes: Record<string, MaterialType> = {
  Container: MaterialType.Container,
  Stillads: MaterialType.Scaffolding,
  Andet: MaterialType.Other,
};

const trafficChanges: Record<string, TrafficChange> = {
  'Hastighedsbegrænsning - hensyn til vejarbejder':
    TrafficChange.SpeedLimitWorkZone,
  'Hastighedsbegrænsning - hensyn til trafikanter':
    TrafficChange.SpeedLimitTrafficSafety,
  'Ubetinget vigepligt i vejkryds':
    TrafficChange.UnconditionalObligationInIntersection,
  'Standsning og Parkering': TrafficChange.NoStoppingAndParking,
  'Påbud om ensrettet færdsel': TrafficChange.OnewayTraffic,
};

const trafficScopes: Record<string, TrafficCalmingMeasureScope> = {
  Begge: TrafficCalmingMeasureScope.Both,
  // TODO: Passing traffic has no exact enum; OncomingTraffic is a placeholder.
  'Forbipasserende trafik': TrafficCalmingMeasureScope.OncomingTraffic,
  'Bagfrakommende trafik': TrafficCalmingMeasureScope.FollowingTraffic,
};

export function mapCreateRoadPermit(
  dto: CreateRoadPermitDto,
  caseNumber: string,
): Prisma.ApplicationCreateInput {
  const startDate = new Date(dto.usageDetails.startDate);
  const endDate = new Date(dto.usageDetails.endDate);
  const isEvent = dto.usageDetails.usage === 'Arrangement';
  const address = dto.applicant.address1.match(/^(.*?)\s+(\d+\S*)$/);

  return {
    caseNumber,
    title: dto.title,
    applicantReference: '', // TODO: Supply the applicant reference.
    type: isEvent
      ? ApplicationType.RoadUsePermitEvent
      : ApplicationType.RoadUsePermit,
    // TODO: The schema supports one traffic change; the form supports several.
    trafficChange:
      trafficChanges[dto.roadMarking.trafficChanges[0]] ??
      TrafficChange.SpeedLimitWorkZone, // TODO: Placeholder for an unmapped selection.
    applicant: {
      create: {
        name: dto.applicant.name,
        type: ApplicantType.Business,
        phoneNumber: dto.applicant.companyPhone,
        email: dto.applicant.email,
        cvrNumber: dto.applicant.cvr,
        mitIdKey: '', // TODO: Supply the authenticated applicant's MitID key.
        address: {
          create: {
            street: address?.[1] ?? dto.applicant.address1,
            houseNumber: address?.[2] ?? '',
            postalCode: dto.applicant.postalCode,
            city: dto.applicant.city,
          },
        },
      },
    },
    contactPersons: {
      create: {
        name: dto.contactInformation.name,
        phoneNumber: dto.contactInformation.phone,
        email: dto.contactInformation.email,
        availability: Availability.AllDay, // TODO: Collect availability in the form.
      },
    },
    // TODO: The schema's unique applicationId currently limits this list to one item.
    trafficCalmingMeasures: {
      create: dto.roadMarking.trafficPrecautions.map((measure) => ({
        type: measure.type as TrafficCalmingMeasureType,
        protectionLevel: measure.protectionLevel,
        scope: trafficScopes[measure.scope],
        description: measure.description,
      })),
    },
    roadUsePermit: {
      create: {
        applicationId: caseNumber,
        isEvent,
        startDate,
        endDate,
        eventStart: startDate,
        eventEnd: endDate,
        usage: usageTypes[dto.usageDetails.usage],
        // TODO: The schema's unique roadUsePermitId currently limits this list to one item.
        materials: {
          create: dto.materials.map((material) => ({
            type: materialTypes[material.type],
            amount: material.quantity,
            description: material.notes,
          })),
        },
      },
    },
    // TODO: Map the work area when its required ownership, size and detail fields exist.
    // TODO: Map documents when an uploaded document's r2ObjectKey is available.
    // Municipality, access ways, confirmation and extra company details have no matching columns.
  };
}
