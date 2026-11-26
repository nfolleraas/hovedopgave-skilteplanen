import { Autocomplete, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  type AddressOption,
  type AddressSuggestion,
  searchAddresses,
} from '../../api/addresses.api.js';

const minQueryLength = 2;
const maxQueryLength = 73;
const searchDelay = 250;

interface AddressAutocompleteProps {
  errorMessage?: string;
  onChange: (address: AddressSuggestion | null) => void;
}

/**
 * Autocomplete field that uses the shared Adressevælger search and returns the
 * selected suggestion to the parent.
 */
export default function AddressAutocomplete({
  errorMessage,
  onChange,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<AddressOption[]>([]);
  const [lookupState, setLookupState] = useState<'done' | 'failed' | null>(
    null,
  );
  const [selectedAddress, setSelectedAddress] =
    useState<AddressSuggestion | null>(null);

  const query = inputValue.trim();

  useEffect(() => {
    if (query.length < minQueryLength || selectedAddress) {
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        const addresses = await searchAddresses(query, controller.signal);
        if (!controller.signal.aborted) {
          setOptions(addresses);
          setLookupState('done');
        }
      } catch {
        if (!controller.signal.aborted) {
          setOptions([]);
          setLookupState('failed');
        }
      }
    }, searchDelay);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selectedAddress]);

  const lookupError =
    lookupState === 'failed'
      ? 'Adressesøgningen kunne ikke gennemføres. Prøv igen om lidt.'
      : lookupState === 'done' && options.length === 0
        ? 'Ingen adresser fundet. Kontrollér vejnavn, husnummer eller postnummer.'
        : undefined;
  const fieldError = errorMessage ?? lookupError;

  return (
    <Autocomplete
      filterOptions={(options) => options}
      getOptionKey={(option) => option.id}
      getOptionLabel={(option) => option.titel}
      inputValue={inputValue}
      loading={
        query.length >= minQueryLength && !selectedAddress && !lookupState
      }
      loadingText="Søger efter adresser…"
      noOptionsText={
        lookupError ? '' : 'Skriv mindst 2 tegn for at søge efter en adresse.'
      }
      onChange={(_, value) => {
        const address = value?.type === 'husnummer' ? value : null;
        if (
          value?.type === 'navngivenvejpostnummer' &&
          value.titel.trim() !== query
        ) {
          setOptions([]);
          setLookupState(null);
        }
        setSelectedAddress(address);
        setInputValue(value?.titel ?? '');
        onChange(address);
      }}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setInputValue(value);
          if (value.trim() !== query || selectedAddress) {
            setOptions([]);
            setLookupState(null);
          }
          setSelectedAddress(null);
          onChange(null);
        }
      }}
      options={options}
      renderInput={(params) => (
        <TextField
          {...params}
          error={Boolean(fieldError)}
          helperText={
            fieldError ??
            'Vælg en adresse med husnummer. Hvis du vælger en vej, kan du søge videre efter husnummeret.'
          }
          label="Adresse"
          placeholder="Søg efter adresse..."
          required
          slotProps={{
            ...params.slotProps,
            htmlInput: {
              ...params.slotProps.htmlInput,
              maxLength: maxQueryLength,
            },
          }}
        />
      )}
      value={selectedAddress}
    />
  );
}
