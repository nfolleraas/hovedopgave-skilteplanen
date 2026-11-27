import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { AreaSource } from '../../../../features/areas/area-edit-state.js';
import {
  areaFieldLabelKeys,
  areaSourceLabelKeys,
  roadOwnershipLabelKeys,
} from '../../../../features/areas/area-labels.js';
import type {
  AreaFieldErrors,
  AreaFieldSet,
} from '../../../../features/areas/area-validation.js';
import type {
  AreaFormField,
  AreaFormValues,
} from '../../../../types/area.types.js';
import type { RoadOwnership } from '../../../../types/prisma-enums.js';
import { areaCardIds } from './area-card-ids.js';
import { AreaForm } from './area-form.js';

export interface AreaDetails {
  houseNumberFrom: string | null;
  houseNumberTo: string | null;
  alternativeDescription: string | null;
}

const detailFields = [
  'houseNumberFrom',
  'houseNumberTo',
  'alternativeDescription',
] as const satisfies readonly (keyof AreaDetails & AreaFormField)[];

interface AreaCardProps {
  areaKey: string;
  number: number;
  roadName: string;
  roadOwnership: RoadOwnership | '';
  /** Whether the road was found on the map or typed in manually. */
  source: AreaSource;
  /** Saved location details shown while the card is collapsed. */
  details: AreaDetails | null;
  isExpanded: boolean;
  isMissingFields: boolean;
  canEditApplication: boolean;
  roadEditable: boolean;
  fieldSet: AreaFieldSet;
  draft: AreaFormValues | null;
  errors: AreaFieldErrors;
  /** True after the user tried to save, so every error is shown. */
  showAllErrors: boolean;
  isSaving: boolean;
  saveError: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onChange: (field: AreaFormField, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Card for one area. A collapsed card shows the road and saved details; an
 * expanded card shows the form to edit the area.
 * @param props - The area values, edit state, errors and event handlers
 * @returns The rendered card
 */
export function AreaCard({
  areaKey,
  number,
  roadName,
  roadOwnership,
  source,
  details,
  isExpanded,
  isMissingFields,
  canEditApplication,
  roadEditable,
  fieldSet,
  draft,
  errors,
  showAllErrors,
  isSaving,
  saveError,
  onEdit,
  onDelete,
  onChange,
  onSave,
  onCancel,
}: AreaCardProps) {
  const { t } = useTranslation();
  const titleId = areaCardIds.title(areaKey);
  const roadId = areaCardIds.road(areaKey);
  // Used in button labels and messages, where the full name is needed.
  const title = t('areas.cardTitle', {
    number,
    road: roadName || t('areas.newRoad'),
  });
  // Third level below the area number and the road: road status and source.
  const statusParts = [
    roadOwnership && t(roadOwnershipLabelKeys[roadOwnership]),
    t(areaSourceLabelKeys[source]),
  ].filter(Boolean);

  return (
    <Paper
      aria-labelledby={`${titleId} ${roadId}`}
      component="section"
      sx={{
        border: isExpanded ? '2px solid #1562AD' : '1px solid #BDBDBD',
        p: 2,
      }}
      variant="outlined"
    >
      <Box
        sx={{
          alignItems: 'flex-start',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            component="h2"
            id={titleId}
            sx={{ fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 }}
            tabIndex={-1}
          >
            {t('areas.areaNumber', { number })}
          </Typography>
          <Typography
            component="h3"
            id={roadId}
            sx={{ fontWeight: 500 }}
            variant="body1"
          >
            {roadName || t('areas.newRoad')}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {statusParts.join(' · ')}
            {!isExpanded && isMissingFields && (
              <>
                {' · '}
                <Box component="span" sx={{ color: 'error.main' }}>
                  {t('areas.missingInfo')}
                </Box>
              </>
            )}
          </Typography>
        </Box>
        {canEditApplication && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isExpanded && (
              <Button
                aria-label={t('areas.editArea', { area: title })}
                id={areaCardIds.edit(areaKey)}
                onClick={onEdit}
                size="small"
                variant="outlined"
              >
                {t('areas.edit')}
              </Button>
            )}
            <Button
              aria-label={t('areas.deleteAreaFor', { area: title })}
              color="error"
              id={areaCardIds.delete(areaKey)}
              onClick={onDelete}
              size="small"
              variant="outlined"
            >
              {t('areas.delete')}
            </Button>
          </Box>
        )}
      </Box>

      {!isExpanded && details && (
        <Box
          component="dl"
          sx={{
            columnGap: 3,
            display: 'flex',
            flexWrap: 'wrap',
            m: 0,
            mt: 1,
            rowGap: 0.5,
          }}
        >
          {detailFields.map((field) => (
            <Box key={field} sx={{ display: 'flex', gap: 0.5 }}>
              <Typography color="text.secondary" component="dt" variant="body2">
                {t(areaFieldLabelKeys[field])}:
              </Typography>
              <Typography component="dd" sx={{ m: 0 }} variant="body2">
                {details[field] || '–'}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {isExpanded && draft && (
        <Box sx={{ mt: 2 }}>
          <AreaForm
            disabled={isSaving}
            errors={errors}
            fieldSet={fieldSet}
            idPrefix={`area-${areaKey}`}
            onChange={onChange}
            roadEditable={roadEditable}
            showAllErrors={showAllErrors}
            values={draft}
          />
          {saveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {saveError}
            </Alert>
          )}
          <Box
            sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}
          >
            <Button disabled={isSaving} onClick={onCancel} variant="outlined">
              {t('areas.cancel')}
            </Button>
            <Button disabled={isSaving} onClick={onSave} variant="contained">
              {t('areas.save')}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
