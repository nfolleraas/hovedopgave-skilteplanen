import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';

export interface AddressSuggestion {
  id: string;
  titel: string;
  type: string;
  husnummerId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class AddressesService {
  async searchAddresses(searchText: string): Promise<AddressSuggestion[]> {
    if (
      typeof searchText !== 'string' ||
      searchText.trim().length < 3 ||
      searchText.trim().length > 73
    ) {
      throw new BadRequestException('Invalid address search text');
    }

    const token = process.env.DATAFORSYNINGEN_TOKEN;

    if (!token) {
      throw new BadGatewayException('Address service is not configured');
    }

    try {
      const url = new URL('https://adressevaelger.dk/adresser/soeg');
      url.search = new URLSearchParams({
        tekst: searchText.trim(),
        token,
        maksimum: '10',
      }).toString();

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Adressevaelger returned ${response.status}`);
      }

      const data: unknown = await response.json();

      if (
        !isRecord(data) ||
        data.status !== 'ok' ||
        !Array.isArray(data.fund)
      ) {
        throw new Error('Invalid Adressevaelger response');
      }

      return data.fund.flatMap((match): AddressSuggestion[] => {
        if (
          !isRecord(match) ||
          typeof match.id !== 'string' ||
          typeof match.titel !== 'string' ||
          typeof match.type !== 'string'
        ) {
          return [];
        }

        if (match.type === 'navngivenvejpostnummer') {
          return [
            {
              id: match.id,
              titel: match.titel,
              type: match.type,
            },
          ];
        }

        if (match.type === 'husnummer' && typeof match.husnummer === 'string') {
          return [
            {
              id: match.id,
              titel: match.titel,
              type: match.type,
              husnummerId: match.id,
            },
          ];
        }

        if (match.type !== 'adresse' || typeof match.husnummerId !== 'string') {
          return [];
        }

        return [
          {
            id: match.id,
            titel: match.titel,
            type: match.type,
            husnummerId: match.husnummerId,
          },
        ];
      });
    } catch (error) {
      console.error('Address lookup error:', error);
      throw new BadGatewayException('Address lookup failed');
    }
  }
}
