import { Autocomplete, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import {
  type AddressOption,
  type AddressSuggestion,
  searchAddresses,
} from '../../api/addresses.api';

interface AddressAutocompleteProps {
  onChange: (address: AddressSuggestion | null) => void;
}

export default function AddressAutocomplete({
  onChange,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<AddressOption[]>([]);
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
        setOptions(addresses);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Address lookup failed:', error);
          setOptions([]);
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
      noOptionsText="Ingen forslag. Prøv vejnavn, husnummer og postnummer."
      onChange={(_, value) => {
        setSelectedAddress(value);
        setInputValue(value?.titel ?? '');
        onChange(value);
      }}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setInputValue(value);
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
