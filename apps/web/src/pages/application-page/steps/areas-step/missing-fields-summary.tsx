import { Alert, AlertTitle, Box } from '@mui/material';
import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface MissingFieldsItem {
  key: string;
  areaTitle: string;
  fieldLabels: string[];
  isUnsaved: boolean;
}

interface MissingFieldsSummaryProps {
  items: MissingFieldsItem[];
  hasNoAreas: boolean;
}

/** Summary shown when Næste is blocked (NF1). Focused so it is announced. */
export const MissingFieldsSummary = forwardRef<
  HTMLDivElement,
  MissingFieldsSummaryProps
>(function MissingFieldsSummary({ items, hasNoAreas }, ref) {
  const { t } = useTranslation();

  return (
    <Alert ref={ref} role="alert" severity="error" sx={{ mt: 3 }} tabIndex={-1}>
      <AlertTitle>{t('areas.summary.title')}</AlertTitle>
      {hasNoAreas && t('areas.summary.noAreas')}
      <Box component="ul" sx={{ m: 0, pl: 2 }}>
        {items.map((item) => (
          <li key={item.key}>
            {item.fieldLabels.length > 0 &&
              t('areas.summary.missingFields', {
                area: item.areaTitle,
                fields: item.fieldLabels.join(', '),
              })}
            {item.fieldLabels.length === 0 &&
              item.isUnsaved &&
              t('areas.summary.unsaved', { area: item.areaTitle })}
          </li>
        ))}
      </Box>
    </Alert>
  );
});
