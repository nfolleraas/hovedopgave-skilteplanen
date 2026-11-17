import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import {
  Alert,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { type KeyboardEvent, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  roadSearchMaxLength,
  roadSearchService,
} from '../../../../api/road-search.api.js';
import { useDebouncedValue } from '../../../../hooks/use-debounced-value.js';
import type { RoadSearchResult } from '../../../../types/area.types.js';

interface RoadSearchProps {
  selectedIds: ReadonlySet<string>;
  /** Selects a road, or removes it again if it is already selected. */
  onToggle: (road: RoadSearchResult) => void;
}

const searchDelayMs = 250;

/**
 * Road search as an ARIA combobox: arrow keys move, Enter selects or removes
 * the active road. A checkbox icon and `aria-checked` show selected roads.
 */
export function RoadSearch({ selectedIds, onToggle }: RoadSearchProps) {
  const { t } = useTranslation();
  const listboxId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RoadSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [searchFailed, setSearchFailed] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), searchDelayMs);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setSearchedQuery('');
      setSearchFailed(false);
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
        setSearchFailed(false);
        setActiveIndex(found.length > 0 ? 0 : -1);
      })
      .catch(() => {
        if (!isCurrent) return;
        setResults([]);
        setSearchedQuery(debouncedQuery);
        setSearchFailed(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [debouncedQuery]);

  const hasAnswer = searchedQuery !== '' && !searchFailed;
  const showPopup = isOpen && hasAnswer;
  const showList = showPopup && results.length > 0;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

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
      onToggle(results[activeIndex]);
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
            maxLength: roadSearchMaxLength,
          },
        }}
        value={query}
      />

      <Paper
        elevation={3}
        sx={{
          border: '1px solid #BDBDBD',
          display: showPopup ? 'block' : 'none',
          left: 0,
          maxHeight: 280,
          mt: 0.5,
          overflowY: 'auto',
          position: 'absolute',
          right: 0,
          zIndex: 10,
        }}
      >
        <List
          aria-label={t('mapStep.searchResults')}
          dense
          disablePadding
          id={listboxId}
          role="listbox"
        >
          {results.map((road, index) => {
            const isActive = index === activeIndex;
            const isSelected = selectedIds.has(road.id);
            return (
              <ListItem
                aria-checked={isSelected}
                aria-selected={isActive}
                id={optionId(index)}
                key={road.id}
                onClick={() => onToggle(road)}
                // Keep focus in the input, so the list stays open.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                sx={{
                  backgroundColor: isActive ? '#F7F9FC' : 'transparent',
                  cursor: 'pointer',
                  outline: isActive ? '2px solid #1562AD' : 'none',
                  outlineOffset: -2,
                }}
              >
                <ListItemIcon sx={{ color: 'primary.main', minWidth: 36 }}>
                  {isSelected ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={road.roadName}
                  secondary={`${road.postalCode} ${road.city}`}
                  slotProps={{
                    primary: { sx: { fontWeight: 600 }, variant: 'body2' },
                    secondary: { variant: 'body2' },
                  }}
                />
              </ListItem>
            );
          })}
        </List>
        {/* Outside the listbox, which may only contain options. */}
        {results.length === 0 && (
          <Typography color="text.secondary" sx={{ px: 2, py: 1.5 }}>
            {t('mapStep.noResults')}
          </Typography>
        )}
      </Paper>

      {searchFailed && (
        <Alert role="alert" severity="error" sx={{ mt: 1 }}>
          {t('mapStep.searchError')}
        </Alert>
      )}

      {/* Announces the search result for screen readers. */}
      <Box
        aria-live="polite"
        component="span"
        role="status"
        sx={visuallyHidden}
      >
        {hasAnswer &&
          (results.length > 0
            ? t('mapStep.resultCount', { count: results.length })
            : t('mapStep.noResults'))}
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
