import { Autocomplete, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type AddressOption,
  type AddressSuggestion,
  searchAddresses,
} from '../../api/addresses.api.js';

interface AddressAutocompleteProps {
  disabled?: boolean;
  errorMessage?: string;
  initialAddressText?: string;
  onChange: (address: AddressSuggestion | null) => void;
}

/**
 * Autocomplete field that searches addresses via the API and returns the
 * selected suggestion to the parent.
 */
export default function AddressAutocomplete({
  disabled,
  errorMessage,
  initialAddressText = '',
  onChange,
}: AddressAutocompleteProps) {
  const { t } = useTranslation();
  const [lookupFailed, setLookupFailed] = useState(false);
  const [inputValue, setInputValue] = useState(initialAddressText);
  const [hasEdited, setHasEdited] = useState(false);
  const [options, setOptions] = useState<AddressOption[]>([]);
  const [selectedAddress, setSelectedAddress] =
    useState<AddressSuggestion | null>(null);

  useEffect(() => {
    if (!hasEdited || inputValue.trim().length < 3 || selectedAddress) {
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        const addresses = await searchAddresses(inputValue, controller.signal);
        if (!controller.signal.aborted) {
          setOptions(addresses);
        }
      } catch {
        if (!controller.signal.aborted) {
          setLookupFailed(true);
          setOptions([]);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [hasEdited, inputValue, selectedAddress]);

  return (
    <Autocomplete
      clearOnBlur={!initialAddressText}
      disabled={disabled}
      filterOptions={(options) => options}
      getOptionKey={(option) => option.id}
      getOptionLabel={(option) => option.titel}
      inputValue={inputValue}
      noOptionsText={
        lookupFailed ? t('address.lookupError') : t('address.noOptions')
      }
      onChange={(_, value) => {
        setSelectedAddress(value);
        setInputValue(value?.titel ?? '');
        onChange(value);
      }}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setHasEdited(true);
          setLookupFailed(false);
          setOptions([]);
          setInputValue(value);
          setSelectedAddress(null);
          onChange(null);
        }
      }}
      options={options}
      renderInput={(params) => (
        <TextField
          {...params}
          error={Boolean(errorMessage)}
          helperText={errorMessage ?? t('address.help')}
          label={t('address.label')}
          placeholder={t('address.placeholder')}
          required
        />
      )}
      value={selectedAddress}
    />
  );
}
