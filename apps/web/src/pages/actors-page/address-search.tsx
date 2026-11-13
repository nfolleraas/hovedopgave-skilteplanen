import { Autocomplete, TextField } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type AddressSuggestion,
  lookupAddress,
  searchAddresses,
} from '../../api/addresses.api.js';
import type { AddressSearchProps } from './actor.types.js';

/**
 * @summary Render a debounced address search that resolves selected house
 * numbers to verified addresses and supports an existing address selection.
 */
export function AddressSearch({
  disabled,
  error,
  initialAddress,
  initialAddressId,
  onChange,
}: AddressSearchProps) {
  const { t } = useTranslation();
  const initialAddressOption = initialAddress
    ? {
        id: initialAddressId ?? 'saved-address',
        title: `${initialAddress.street} ${initialAddress.houseNumber}, ${initialAddress.postalCode} ${initialAddress.city}`,
      }
    : null;
  const [query, setQuery] = useState(initialAddressOption?.title ?? '');
  const [options, setOptions] = useState<AddressSuggestion[]>([]);
  const [selected, setSelected] = useState<AddressSuggestion | null>(
    initialAddressOption,
  );
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [failed, setFailed] = useState(false);
  const searchController = useRef<AbortController | null>(null);
  const lookupController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (selected || query.trim().length < 3) return;
    const controller = new AbortController();
    searchController.current = controller;
    const timer = setTimeout(async () => {
      try {
        const suggestions = await searchAddresses(
          query.trim(),
          controller.signal,
        );
        if (!controller.signal.aborted) setOptions(suggestions);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  useEffect(() => () => lookupController.current?.abort(), []);

  /**
   * @summary Replace the search text, cancelling pending requests
   * and clearing the previously verified address.
   */
  function changeQuery(text: string) {
    searchController.current?.abort();
    lookupController.current?.abort();
    setQuery(text);
    setOptions([]);
    setSelected(null);
    setFailed(false);
    setResolving(false);
    setSearching(text.trim().length >= 3);
    onChange(null, null);
  }

  /**
   * @summary Clear the selection, refine the search, or resolve a house-number
   * suggestion, publishing the address only if its lookup is still current.
   */
  async function selectAddress(option: AddressSuggestion | null) {
    if (!option) {
      changeQuery('');
      return;
    }
    if (option.searchText) {
      changeQuery(`${option.searchText} `);
      return;
    }
    searchController.current?.abort();
    lookupController.current?.abort();
    const controller = new AbortController();
    lookupController.current = controller;
    setSelected(option);
    setQuery(option.title);
    setOptions([option]);
    setSearching(false);
    setResolving(true);
    setFailed(false);
    onChange(null, null);
    try {
      const address = await lookupAddress(option.id, controller.signal);
      if (!controller.signal.aborted) onChange(address, option.id);
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (!controller.signal.aborted) setResolving(false);
    }
  }

  const helperText = failed
    ? t('actors.errors.addressLookup')
    : (error ??
      (searching || resolving
        ? t('actors.addressSearching')
        : t('actors.addressSearchHint')));

  return (
    <Autocomplete
      autoHighlight
      clearText={t('actors.addressClear')}
      closeText={t('actors.addressClose')}
      disabled={disabled}
      filterOptions={(suggestions) => suggestions}
      getOptionLabel={(option) => option.title}
      inputValue={query}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      loading={searching || resolving}
      loadingText={t('actors.addressSearching')}
      noOptionsText={
        query.trim().length < 3
          ? t('actors.addressSearchHint')
          : t('actors.addressNoMatches')
      }
      onChange={(_event, option) => void selectAddress(option)}
      onInputChange={(_event, text, reason) => {
        if (reason === 'input' || reason === 'clear') changeQuery(text);
      }}
      openText={t('actors.addressOpen')}
      options={options}
      renderInput={(params) => (
        <TextField
          {...params}
          error={Boolean(error) || failed}
          helperText={helperText}
          label={t('actors.address')}
          name="address"
          placeholder={t('actors.addressPlaceholder')}
          required
          size="small"
        />
      )}
      size="small"
      value={selected}
    />
  );
}
