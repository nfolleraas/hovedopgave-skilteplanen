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

export type CreateRoadPermitData = Omit<
  Prisma.ApplicationCreateInput,
  'roadUsePermit'
> & {
  roadUsePermit: {
    create: Omit<
      Prisma.RoadUsePermitCreateWithoutApplicationInput,
      'applicationId'
    >;
  };
};

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

/** Converts the submitted form into Prisma create data for the application, work area, applicant, and permit. */
export function mapCreateRoadPermit(
  dto: CreateRoadPermitDto,
): CreateRoadPermitData {
  const { usageDetails } = dto;
  const startDate = new Date(usageDetails.startDate);
  const endDate = new Date(usageDetails.endDate);
  const isEvent = usageDetails.usage === 'Arrangement';
  const applicantAddress = dto.applicant.address1?.trim();
  const addressParts = applicantAddress?.match(/^(.*?)\s+(\d+\S*)$/);

  return {
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
        address: applicantAddress
          ? {
              create: {
                street: addressParts?.[1] ?? applicantAddress,
                houseNumber: addressParts?.[2] ?? '',
                postalCode: dto.applicant.postalCode,
                city: dto.applicant.city,
              },
            }
          : undefined,
      },
    },
    areas: {
      create: {
        roadName: usageDetails.road.trim(),
        houseNumberFrom: usageDetails.houseNumberFrom?.trim() || null,
        houseNumberTo: usageDetails.houseNumberTo?.trim() || null,
        postalCode: usageDetails.postalCode.trim(),
        city: usageDetails.city.trim(),
        alternativeDescription:
          usageDetails.locationDescription?.trim() || null,
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
        isEvent,
        startDate,
        endDate,
        eventStart: startDate,
        eventEnd: endDate,
        usage: usageTypes[usageDetails.usage],
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
    // TODO: Map documents when an uploaded document's r2ObjectKey is available.
    // Municipality, access ways, confirmation and extra company details have no matching columns.
  };
}
