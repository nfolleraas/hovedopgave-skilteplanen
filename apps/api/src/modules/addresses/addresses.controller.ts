import { Controller, Get, Query } from '@nestjs/common';
import {
  AddressesService,
  type AddressSuggestion,
} from './addresses.service.js';

@Controller('addresses')
export class AddressesController {
  /**
   * Connects the HTTP controller to the service that performs address lookups.
   */
  constructor(private readonly addressesService: AddressesService) {}

  /**
   * Passes the query text to the address service and returns street and
   * address suggestions for the form.
   */
  @Get('search')
  searchAddresses(@Query('text') text: string): Promise<AddressSuggestion[]> {
    return this.addressesService.searchAddresses(text);
  }
}
