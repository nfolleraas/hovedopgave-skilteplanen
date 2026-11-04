import { Box, TextField, Typography } from '@mui/material';
import { type KeyboardEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { roadSearchService } from '../../../../api/road-search.api.js';
import { roadOwnershipLabelKeys } from '../../../../features/areas/area-labels.js';
import { useDebouncedValue } from '../../../../hooks/use-debounced-value.js';
import type { RoadSearchResult } from '../../../../types/area.types.js';

interface RoadSearchProps {
  selectedIds: ReadonlySet<string>;
  onSelect: (road: RoadSearchResult) => void;
}

const searchDelayMs = 250;

/** Road search as an ARIA combobox: arrow keys move, Enter selects. */
export function RoadSearch({ selectedIds, onSelect }: RoadSearchProps) {
  const { t } = useTranslation();
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RoadSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchedQuery, setSearchedQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), searchDelayMs);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setSearchedQuery('');
      return;
    }

    // Ignore answers to older queries that arrive late.
    let isCurrent = true;
    roadSearchService
      .search(debouncedQuery)
      .then((found) => {
        if (!isCurrent) return;
        setResults(found);
        setSearchedQuery(debouncedQuery);
        setActiveIndex(found.length > 0 ? 0 : -1);
      })
      .catch(() => {
        if (!isCurrent) return;
        setResults([]);
        setSearchedQuery(debouncedQuery);
      });

    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery]);

  const showList = isOpen && searchedQuery !== '';
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  function select(road: RoadSearchResult) {
    if (!selectedIds.has(road.id)) {
      onSelect(road);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && showList && results[activeIndex]) {
      event.preventDefault();
      select(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        fullWidth
        label={t('mapStep.searchLabel')}
        onBlur={() => setIsOpen(false)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={t('mapStep.searchPlaceholder')}
        slotProps={{
          htmlInput: {
            role: 'combobox',
            'aria-autocomplete': 'list',
            'aria-controls': listboxId,
            'aria-expanded': showList,
            'aria-activedescendant':
              showList && activeIndex >= 0 ? optionId(activeIndex) : undefined,
            autoComplete: 'off',
          },
        }}
        value={query}
      />

      <Box
        aria-label={t('mapStep.searchResults')}
        component="ul"
        id={listboxId}
        role="listbox"
        sx={{
          backgroundColor: 'background.paper',
          border: showList ? '1px solid #BDBDBD' : 'none',
          borderRadius: 1,
          boxShadow: showList ? 3 : 'none',
          display: showList ? 'block' : 'none',
          left: 0,
          listStyle: 'none',
          m: 0,
          maxHeight: 280,
          mt: 0.5,
          overflowY: 'auto',
          p: 0,
          position: 'absolute',
          right: 0,
          zIndex: 10,
        }}
      >
        {results.map((road, index) => {
          const isSelected = selectedIds.has(road.id);
          return (
            <Box
              aria-selected={index === activeIndex}
              component="li"
              id={optionId(index)}
              key={road.id}
              onClick={() => select(road)}
              // Prevent the input from losing focus before the click.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              sx={{
                backgroundColor:
                  index === activeIndex ? '#F7F9FC' : 'transparent',
                cursor: 'pointer',
                outline: index === activeIndex ? '2px solid #1562AD' : 'none',
                outlineOffset: -2,
                px: 2,
                py: 1,
              }}
            >
              <Typography sx={{ fontWeight: 600 }} variant="body2">
                {road.roadName}
                {isSelected && ` · ${t('mapStep.alreadySelected')}`}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {road.postalCode} {road.city} ·{' '}
                {t(roadOwnershipLabelKeys[road.roadOwnership])}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Box aria-live="polite" role="status" sx={{ mt: 1 }}>
        {searchedQuery !== '' && results.length === 0 && (
          <Typography color="text.secondary" variant="body2">
            {t('mapStep.noResults')}
          </Typography>
        )}
        {showList && results.length > 0 && (
          <Box component="span" sx={visuallyHidden}>
            {t('mapStep.resultCount', { count: results.length })}
          </Box>
        )}
      </Box>
    </Box>
  );
}

const visuallyHidden = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
} as const;
