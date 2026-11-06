import { Controller, Get, Query } from '@nestjs/common';
import { AddressesService } from './addresses.service.js';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get('search')
  searchAddresses(@Query('text') text: string) {
    return this.addressesService.searchAddresses(text);
  }
}
