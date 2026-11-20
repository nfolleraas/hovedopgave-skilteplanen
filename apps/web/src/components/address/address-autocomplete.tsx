import { Autocomplete, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  type AddressOption,
  type AddressSuggestion,
  searchAddresses,
} from '../../api/addresses.api.js';

interface AddressAutocompleteProps {
  onChange: (address: AddressSuggestion | null) => void;
}

/**
 * Autocomplete field that searches addresses via the API and returns the
 * selected suggestion to the parent.
 */
export default function AddressAutocomplete({
  onChange,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<AddressOption[]>([]);
  const [lookupComplete, setLookupComplete] = useState(false);
  const [selectedAddress, setSelectedAddress] =
    useState<AddressSuggestion | null>(null);

  useEffect(() => {
    if (inputValue.trim().length < 3 || selectedAddress) {
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        const addresses = await searchAddresses(inputValue, controller.signal);
        if (!controller.signal.aborted) {
          setOptions(addresses);
          setLookupComplete(true);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Address lookup failed:', error);
          setOptions([]);
          setLookupComplete(true);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [inputValue, selectedAddress]);

  return (
    <Autocomplete
      filterOptions={(options) => options}
      getOptionLabel={(option) => option.titel}
      inputValue={inputValue}
      loading={
        inputValue.trim().length >= 3 && !selectedAddress && !lookupComplete
      }
      loadingText="Søger efter adresser…"
      noOptionsText={
        lookupComplete
          ? 'Ugyldig adresse. Prøv igen senere eller kontakt support.'
          : 'Skriv mindst 3 tegn for at søge efter en adresse.'
      }
      onChange={(_, value) => {
        setSelectedAddress(value);
        setInputValue(value?.titel ?? '');
        onChange(value);
      }}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setInputValue(value);
          setOptions([]);
          setLookupComplete(false);
          setSelectedAddress(null);
          onChange(null);
        }
      }}
      options={options}
      renderInput={(params) => (
        <TextField
          {...params}
          helperText="Vælg en adresse eller et vejforslag."
          label="Adresse"
          placeholder="Søg efter adresse..."
          required
        />
      )}
      value={selectedAddress}
    />
  );
}
