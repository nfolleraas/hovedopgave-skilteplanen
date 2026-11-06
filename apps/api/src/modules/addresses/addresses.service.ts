import { BadGatewayException, Injectable } from '@nestjs/common';

export interface AddressSuggestion {
  id: string;
  titel: string;
}

interface AddressResponse {
  status: string;
  fund: AddressSuggestion[];
}

@Injectable()
export class AddressesService {
  async searchAddresses(searchText: string): Promise<AddressSuggestion[]> {
    const params = new URLSearchParams({
      tekst: searchText,
      token: 'adressevaelger123',
      maksimum: '10',
    });

    try {
      const response = await fetch(
        `https://adressevaelger.dk/adresser/soeg?${params}`,
        { signal: AbortSignal.timeout(5000) },
      );

      if (!response.ok) {
        throw new Error('Address API request failed');
      }

      const data: AddressResponse = await response.json();

      if (data.status !== 'ok') {
        throw new Error('Address API returned an error');
      }

      return data.fund;
    } catch (error) {
      console.error('Address lookup error:', error);
      throw new BadGatewayException('Address lookup failed');
    }
  }
}
