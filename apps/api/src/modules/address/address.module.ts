import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AddressRepository } from './address.repository.js';
import { AddressService } from './address.service.js';

@Module({
  imports: [PrismaModule],
  providers: [AddressService, AddressRepository],
  exports: [AddressService],
})
export class AddressModule {}
