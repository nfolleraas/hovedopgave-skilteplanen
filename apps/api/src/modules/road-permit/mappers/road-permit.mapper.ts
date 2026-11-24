import type { Prisma } from '../../../generated/prisma/client.js';
import {
  ApplicantType,
  ApplicationType,
  Availability,
  TrafficCalmingMeasureType,
} from '../../../generated/prisma/enums.js';
import type { CreateRoadPermitDto } from '../dto/create-road-permit.dto.js';
import {
  materialTypes,
  trafficChanges,
  trafficScopes,
  usageTypes,
} from '../road-permit-options.js';

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
  const selectedTrafficChanges = dto.roadMarking.trafficChanges.flatMap(
    (selection) => trafficChanges[selection],
  );

  return {
    title: dto.title,
    applicantReference: '', // TODO: Supply the applicant reference.
    type: isEvent
      ? ApplicationType.RoadUsePermitEvent
      : ApplicationType.RoadUsePermit,
    trafficChanges: [...new Set(selectedTrafficChanges)],
    accessWays: dto.roadMarking.accessWays.trim() || null,
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
    // Municipality, confirmation and extra company details have no matching columns.
  };
}
