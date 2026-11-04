import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { roadOwnershipLabelKeys } from '../../../../features/areas/area-labels.js';
import type {
  AreaFieldErrors,
  AreaFieldSet,
} from '../../../../features/areas/area-validation.js';
import type {
  AreaFormField,
  AreaFormValues,
} from '../../../../types/area.types.js';
import type { RoadOwnership } from '../../../../types/prisma-enums.js';
import { AreaForm } from './area-form.js';

interface AreaCardProps {
  areaKey: string;
  number: number;
  roadName: string;
  roadOwnership: RoadOwnership | '';
  isExpanded: boolean;
  isMissingFields: boolean;
  isEditable: boolean;
  canEditApplication: boolean;
  roadEditable: boolean;
  fieldSet: AreaFieldSet;
  draft: AreaFormValues | null;
  errors: AreaFieldErrors;
  isSaving: boolean;
  saveError: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onChange: (field: AreaFormField, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AreaCard({
  areaKey,
  number,
  roadName,
  roadOwnership,
  isExpanded,
  isMissingFields,
  isEditable,
  canEditApplication,
  roadEditable,
  fieldSet,
  draft,
  errors,
  isSaving,
  saveError,
  onEdit,
  onDelete,
  onChange,
  onSave,
  onCancel,
}: AreaCardProps) {
  const { t } = useTranslation();
  const titleId = `area-${areaKey}-title`;
  const title = t('areas.cardTitle', {
    number,
    road: roadName || t('areas.newRoad'),
  });

  return (
    <Paper
      aria-labelledby={titleId}
      component="section"
      sx={{
        border: isExpanded ? '2px solid #1562AD' : '1px solid #BDBDBD',
        p: 2,
      }}
      variant="outlined"
    >
      <Box
        sx={{
          alignItems: 'center',
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
            sx={{ fontWeight: 600 }}
            variant="body1"
          >
            {title}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {roadOwnership && t(roadOwnershipLabelKeys[roadOwnership])}
            {!isExpanded && isMissingFields && (
              <>
                {roadOwnership && ' · '}
                <Box component="span" sx={{ color: 'error.main' }}>
                  {t('areas.missingInfo')}
                </Box>
              </>
            )}
          </Typography>
        </Box>
        {canEditApplication && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isExpanded && isEditable && (
              <Button
                aria-label={t('areas.editArea', { area: title })}
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
              onClick={onDelete}
              size="small"
              variant="outlined"
            >
              {t('areas.delete')}
            </Button>
          </Box>
        )}
      </Box>

      {isExpanded && draft && (
        <Box sx={{ mt: 2 }}>
          <AreaForm
            disabled={isSaving}
            errors={errors}
            fieldSet={fieldSet}
            idPrefix={`area-${areaKey}`}
            onChange={onChange}
            roadEditable={roadEditable}
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
