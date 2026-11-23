import { BadRequestException, HttpStatus } from '@nestjs/common';
import { TrafficCalmingMeasureType } from '../../generated/prisma/enums.js';
import type { CreateRoadPermitDto } from './dto/create-road-permit.dto.js';
import type { UpdateRoadPermitDto } from './dto/update-road-permit.dto.js';
import {
  materialTypes,
  trafficChanges,
  trafficScopes,
  usageTypes,
} from './road-permit-options.js';

type Check = (value: unknown, path: string) => void;

function requireValue(
  valid: unknown,
  path: string,
  rule: string,
  details?: { code: string; index: number },
): asserts valid {
  if (valid) return;
  const message = `${path} ${rule}.`;
  throw new BadRequestException(
    details
      ? {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message,
          ...details,
        }
      : message,
  );
}

const string: Check = (value, path) =>
  requireValue(typeof value === 'string', path, 'must be a string');
const number: Check = (value, path) =>
  requireValue(Number.isFinite(value), path, 'must be a finite number');
const boolean: Check = (value, path) =>
  requireValue(typeof value === 'boolean', path, 'must be a boolean');

function nullable(check: Check): Check {
  return (value, path) => {
    if (value !== null) check(value, path);
  };
}

function array(check: Check): Check {
  return (value, path) => {
    requireValue(Array.isArray(value), path, 'must be an array');
    value.forEach((item, index) => {
      check(item, `${path}[${index}]`);
    });
  };
}

function object(fields: Record<string, Check>, partial = false): Check {
  return (value, path) => {
    requireValue(
      typeof value === 'object' && value !== null && !Array.isArray(value),
      path || 'body',
      'must be an object',
    );
    for (const [key, check] of Object.entries(fields)) {
      const field = (value as Record<string, unknown>)[key];
      if (field !== undefined || !partial) {
        check(field, path ? `${path}.${key}` : key);
      }
    }
  };
}

const materials = array(
  object({ id: string, type: string, quantity: number, notes: string }),
);
const usageDetails = {
  usage: string,
  startDate: string,
  endDate: string,
  road: string,
  houseNumberFrom: string,
  houseNumberTo: string,
  postalCode: string,
  city: string,
  locationDescription: string,
};
const contactInformation = { name: string, phone: string, email: string };
const roadMarking = {
  trafficChanges: array(string),
  accessWays: string,
  trafficPrecautions: array(
    object({
      type: string,
      protectionLevel: string,
      scope: string,
      description: string,
    }),
  ),
};

const draftShape = object(
  {
    title: string,
    municipalityName: nullable(string),
    materials,
    usageDetails: object(usageDetails, true),
    contactInformation: object(contactInformation, true),
    roadMarking: object(roadMarking, true),
    materialDraft: object(
      {
        editingId: nullable(string),
        type: string,
        quantity: string,
        notes: string,
      },
      true,
    ),
  },
  true,
);

const submissionShape = object({
  title: string,
  municipalityName: string,
  materials,
  usageDetails: object(usageDetails),
  contactInformation: object(contactInformation),
  roadMarking: object(roadMarking),
  documentPlaceholder: object({
    name: string,
    DocumentType: string,
    Doc_URL: string,
    DateForUpload: string,
  }),
  applicant: object({
    name: string,
    department: string,
    address1: string,
    address2: string,
    postalCode: string,
    city: string,
    contactPerson: string,
    directPhone: string,
    mobile: string,
    email: string,
    companyPhone: string,
    cvr: string,
  }),
  confirmed: boolean,
});

export function parseRoadPermitDraft(value: unknown): UpdateRoadPermitDto {
  draftShape(value, '');
  const draft = value as UpdateRoadPermitDto;
  if (!draft.roadMarking?.trafficChanges) return draft;

  return {
    ...draft,
    roadMarking: {
      ...draft.roadMarking,
      trafficChanges: draft.roadMarking.trafficChanges.map((change) =>
        Object.hasOwn(trafficChanges, change) ? trafficChanges[change] : change,
      ),
    },
  };
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^(?:\d{8}|(?:\+|00)[1-9]\d{6,14})$/;
const houseNumberPattern = /^[1-9]\d*[a-zæøå]?$/i;

function validateLocation(usage: CreateRoadPermitDto['usageDetails']) {
  requireValue(usage.road.trim(), 'usageDetails.road', 'is required');
  requireValue(
    /^\d{4}$/.test(usage.postalCode.trim()),
    'usageDetails.postalCode',
    'must contain four digits',
  );
  requireValue(usage.city.trim(), 'usageDetails.city', 'is required');

  const from = usage.houseNumberFrom.trim();
  const to = usage.houseNumberTo.trim();
  requireValue(
    !from || houseNumberPattern.test(from),
    'usageDetails.houseNumberFrom',
    'must be a valid house number',
  );
  requireValue(
    !to || houseNumberPattern.test(to),
    'usageDetails.houseNumberTo',
    'must be a valid house number',
  );
  requireValue(
    !to || from,
    'usageDetails.houseNumberFrom',
    'is required when a range end is supplied',
  );
  requireValue(
    !to ||
      from.localeCompare(to, 'da', { numeric: true, sensitivity: 'base' }) <= 0,
    'usageDetails.houseNumberTo',
    'must be on or after the first house number',
  );
}

function validateContact(
  name: string,
  phone: string,
  email: string,
  path: string,
  phoneField: string,
) {
  requireValue(name.trim(), `${path}.name`, 'is required');
  requireValue(
    phonePattern.test(phone.replace(/[\s().-]/g, '')),
    `${path}.${phoneField}`,
    'must be a valid phone number',
  );
  requireValue(
    emailPattern.test(email.trim()),
    `${path}.email`,
    'must be a valid email address',
  );
}

export function parseRoadPermitSubmission(value: unknown) {
  submissionShape(value, '');
  const dto = value as CreateRoadPermitDto & { municipalityName: string };
  const { usageDetails: usage, contactInformation: contact, applicant } = dto;
  requireValue(dto.confirmed, 'confirmed', 'must be true');
  requireValue(dto.title.trim(), 'title', 'is required');
  requireValue(dto.municipalityName.trim(), 'municipalityName', 'is required');
  requireValue(
    Object.hasOwn(usageTypes, usage.usage),
    'usageDetails.usage',
    'must be a supported usage',
  );
  requireValue(
    isDate(usage.startDate),
    'usageDetails.startDate',
    'must be a valid date',
  );
  requireValue(
    isDate(usage.endDate),
    'usageDetails.endDate',
    'must be a valid date',
  );
  requireValue(
    usage.endDate >= usage.startDate,
    'usageDetails.endDate',
    'must be on or after the start date',
  );
  validateLocation(usage);
  validateContact(
    contact.name,
    contact.phone,
    contact.email,
    'contactInformation',
    'phone',
  );
  validateContact(
    applicant.name,
    applicant.companyPhone,
    applicant.email,
    'applicant',
    'companyPhone',
  );

  requireValue(
    dto.materials.length > 0,
    'materials',
    'must contain at least one material',
  );
  dto.materials.forEach((material, index) => {
    const path = `materials[${index}]`;
    requireValue(
      Object.hasOwn(materialTypes, material.type),
      `${path}.type`,
      'must be a supported material',
      { code: 'MATERIAL_UNAVAILABLE', index },
    );
    requireValue(
      Number.isSafeInteger(material.quantity) && material.quantity >= 1,
      `${path}.quantity`,
      'must be a positive whole number',
    );
  });
  dto.roadMarking.trafficChanges.forEach((change, index) => {
    requireValue(
      Object.hasOwn(trafficChanges, change),
      `roadMarking.trafficChanges[${index}]`,
      'must be a supported traffic change',
      { code: 'TRAFFIC_CHANGE_UNAVAILABLE', index },
    );
  });
  requireValue(
    dto.roadMarking.trafficPrecautions.length > 0,
    'roadMarking.trafficPrecautions',
    'must contain at least one traffic measure',
  );
  dto.roadMarking.trafficPrecautions.forEach((measure, index) => {
    const path = `roadMarking.trafficPrecautions[${index}]`;
    requireValue(
      Object.hasOwn(TrafficCalmingMeasureType, measure.type),
      `${path}.type`,
      'must be a supported traffic precaution',
    );
    requireValue(
      Object.hasOwn(trafficScopes, measure.scope),
      `${path}.scope`,
      'must be a supported scope',
    );
  });
  return dto;
}
