import SearchIcon from '@mui/icons-material/Search';
import {
  Autocomplete,
  Box,
  ClickAwayListener,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { type SubmitEvent, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { visuallyHidden } from '../visuallyHidden';
import { getAddressData } from './adressevaelger';

const maxQueryLength = 73;
const minQueryLength = 2;
const suggestionLimit = 5;
const searchDelay = 250;

type SearchResult = {
  type: string;
  id?: string;
  titel?: string;
};

type SearchMatch = { addressId?: string; label: string };
type SearchResponse = { matches: SearchMatch[]; failed?: true };
type AddressPoint = [number, number];

async function findAddresses(text: string, signal: AbortSignal) {
  const data = await getAddressData<{ status: string; fund: SearchResult[] }>(
    'soeg',
    new URLSearchParams({ tekst: text, maksimum: String(suggestionLimit) }),
    signal,
  );
  if (data.status !== 'ok' || !Array.isArray(data.fund)) {
    throw new Error('Invalid address search response');
  }

  const matches = new Map<string, SearchMatch>();
  for (const { type, id, titel } of data.fund) {
    if (!titel || (type === 'husnummer' && !id)) continue;

    const addressId = type === 'husnummer' ? id : undefined;
    matches.set(addressId ?? titel, { addressId, label: titel });
    if (matches.size === suggestionLimit) break;
  }
  return [...matches.values()];
}

export function MapAddressSearch({
  onLocate,
}: {
  onLocate: (point: AddressPoint) => void;
}) {
  const { t } = useTranslation();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const locationRequest = useRef<AbortController>(null);
  const [expanded, setExpanded] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [search, setSearch] = useState({ text: '', delay: searchDelay });
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [locationState, setLocationState] = useState<
    'locating' | 'error' | null
  >(null);
  const [locatedAddress, setLocatedAddress] = useState('');
  const query = search.text.trim();
  const canSearch = query.length >= minQueryLength;
  const locating = locationState === 'locating';
  const showSuggestions = expanded && suggestionsOpen && canSearch && !locating;
  const loading = showSuggestions && !response;

  useEffect(() => () => locationRequest.current?.abort(), []);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus({ preventScroll: true });
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      buttonRef.current?.focus({ preventScroll: true });
    }
  }, [expanded]);

  useEffect(() => {
    if (!showSuggestions) return;

    const request = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const matches = await findAddresses(query, request.signal);
        if (!request.signal.aborted) setResponse({ matches });
      } catch {
        if (!request.signal.aborted) setResponse({ matches: [], failed: true });
      }
    }, search.delay);

    return () => {
      window.clearTimeout(timer);
      request.abort();
    };
  }, [query, search, showSuggestions]);

  function closeSearch(returnFocus = false) {
    if (!expanded) return;
    restoreFocus.current = returnFocus;
    locationRequest.current?.abort();
    setLocationState(null);
    setSuggestionsOpen(false);
    setExpanded(false);
  }

  function updateSearch(text: string, delay: number) {
    setLocatedAddress('');
    setLocationState(null);
    setResponse(null);
    setSearch({ text, delay });
    setSuggestionsOpen(true);
  }

  function submitSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSearch && !locating) {
      updateSearch(search.text, 0);
      inputRef.current?.focus();
    }
  }

  async function selectMatch({ addressId, label }: SearchMatch) {
    setSuggestionsOpen(false);
    if (!addressId) {
      setSearch({ text: label, delay: searchDelay });
      setResponse(null);
      inputRef.current?.focus();
      return;
    }
    if (locating) return;

    const request = new AbortController();
    locationRequest.current = request;
    setLocationState('locating');

    try {
      const data = await getAddressData<{
        husnummer?: {
          adgangspunkt?: {
            geometri?: { coordinates?: number[] };
          };
        };
      }>(encodeURIComponent(addressId), new URLSearchParams(), request.signal);
      const [x, y] = data.husnummer?.adgangspunkt?.geometri?.coordinates ?? [];
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error('Address location is missing');
      }
      if (request.signal.aborted) return;

      onLocate([x, y]);
      setSearch({ text: label, delay: searchDelay });
      setResponse(null);
      setLocatedAddress(label);
      closeSearch(true);
    } catch {
      if (!request.signal.aborted) setLocationState('error');
    }
  }

  return (
    <ClickAwayListener onClickAway={() => closeSearch()}>
      <Box
        aria-label={t('permit.map.search.title')}
        component="form"
        onKeyDown={(event) => {
          if (expanded && event.key === 'Escape' && !event.defaultPrevented) {
            event.preventDefault();
            event.stopPropagation();
            closeSearch(true);
          }
        }}
        onSubmit={submitSearch}
        role="search"
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          width: expanded ? 340 : 40,
          bgcolor: 'background.paper',
          borderRadius: 5,
          boxShadow: expanded ? 1 : 0,
          '&:has(.MuiInputBase-input:focus-visible)': {
            outline: '2px solid',
            outlineColor: 'text.primary',
            outlineOffset: 2,
          },
          transition: (theme) =>
            theme.transitions.create('width', { duration: 220 }),
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      >
        <Box
          inert={!expanded}
          sx={{
            flex: 1,
            minWidth: 0,
            visibility: expanded ? 'visible' : 'hidden',
          }}
        >
          <Autocomplete<SearchMatch>
            clearOnBlur={false}
            disablePortal
            filterOptions={(options) => options}
            forcePopupIcon={false}
            getOptionKey={(match) => match.addressId ?? match.label}
            getOptionLabel={(match) => match.label}
            id={inputId}
            inputValue={search.text}
            loading={loading}
            loadingText={t('permit.map.search.searching')}
            noOptionsText={t(
              response?.failed
                ? 'permit.map.search.error'
                : 'permit.map.search.noResults',
            )}
            onChange={(_, match) => {
              if (match) void selectMatch(match);
            }}
            onClose={(_, reason) => {
              if (reason !== 'selectOption') setSuggestionsOpen(false);
            }}
            onInputChange={(_, text, reason) => {
              if (reason === 'input') updateSearch(text, searchDelay);
            }}
            onOpen={() => {
              if (!locating) setLocationState(null);
              setSuggestionsOpen(true);
            }}
            open={showSuggestions}
            options={response?.matches ?? []}
            readOnly={locating}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={inputRef}
                placeholder={t('permit.map.search.address')}
                slotProps={{
                  ...params.slotProps,
                  input: { ...params.slotProps.input, disableUnderline: true },
                  htmlInput: {
                    ...params.slotProps.htmlInput,
                    'aria-label': t('permit.map.search.address'),
                    maxLength: maxQueryLength,
                  },
                }}
                sx={{ px: 1.5 }}
                variant="standard"
              />
            )}
            slotProps={{ listbox: { sx: { maxHeight: 'min(260px, 45dvh)' } } }}
            value={null}
          />
        </Box>
        <IconButton
          aria-controls={expanded ? undefined : inputId}
          aria-expanded={expanded ? undefined : false}
          aria-label={
            expanded
              ? t('permit.map.search.submit')
              : t('permit.map.search.title')
          }
          color="primary"
          disabled={expanded && (!canSearch || locating)}
          onClick={(event) => {
            if (!expanded) {
              event.preventDefault();
              setExpanded(true);
            }
          }}
          ref={buttonRef}
          sx={{ flex: '0 0 40px', width: 40, height: 40 }}
          title={
            expanded
              ? t('permit.map.search.submit')
              : t('permit.map.search.title')
          }
          type={expanded ? 'submit' : 'button'}
        >
          <SearchIcon />
        </IconButton>
        {expanded && locationState && (
          <Paper
            sx={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              insetInline: 0,
              p: 1,
            }}
          >
            <Typography variant="body2">
              {locating
                ? t('permit.map.search.locating')
                : t('permit.map.search.error')}
            </Typography>
          </Paper>
        )}
        <Box role="status" sx={visuallyHidden}>
          {loading && t('permit.map.search.searching')}
          {showSuggestions && response?.failed && t('permit.map.search.error')}
          {showSuggestions &&
            response &&
            !response.failed &&
            (response.matches.length
              ? t('permit.map.search.chooseResult')
              : t('permit.map.search.noResults'))}
          {locating && t('permit.map.search.locating')}
          {locationState === 'error' && t('permit.map.search.error')}
          {locatedAddress &&
            t('permit.map.search.positioned', { address: locatedAddress })}
        </Box>
      </Box>
    </ClickAwayListener>
  );
}
