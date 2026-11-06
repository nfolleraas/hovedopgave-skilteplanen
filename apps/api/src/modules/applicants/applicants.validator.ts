import { BadRequestException } from '@nestjs/common';
import type { CreateApplicantDto } from './dto/create-applicant.dto.js';

export function validateCreateApplicant(data: CreateApplicantDto): void {
  if (typeof data.name !== 'string' || !data.name.trim()) {
    throw new BadRequestException('Name is required');
  }

  if (data.type !== 'private' && data.type !== 'business') {
    throw new BadRequestException('Invalid applicant type');
  }

  if (
    typeof data.phoneNumber !== 'string' ||
    !/^[0-9]{8}$/.test(data.phoneNumber)
  ) {
    throw new BadRequestException('Phone number must contain 8 digits');
  }

  if (
    typeof data.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  ) {
    throw new BadRequestException('Invalid email address');
  }

  if (
    data.type === 'business' &&
    (typeof data.cvrNumber !== 'string' || !/^[0-9]{8}$/.test(data.cvrNumber))
  ) {
    throw new BadRequestException('CVR number must contain 8 digits');
  }

  if (
    typeof data.addressLookupId !== 'string' ||
    !data.addressLookupId.trim()
  ) {
    throw new BadRequestException('Address is required');
  }
}
