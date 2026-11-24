import { Alert, Box, Button, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createAreas } from '../../../../api/areas.api.js';
import { ApiError } from '../../../../api/client.js';
import { canEditAreas } from '../../../../features/areas/area-validation.js';
import { usePendingFocus } from '../../../../hooks/use-pending-focus.js';
import type {
  Area,
  AreaApplication,
  SelectedRoad,
} from '../../../../types/area.types.js';
import type { RoadOwnership } from '../../../../types/prisma-enums.js';
import { WizardFooter } from '../../components/wizard-footer.js';
import { MapPlaceholder } from './map-placeholder.js';
import { RoadSearch } from './road-search.js';
import { roadOwnershipId } from './selected-road-ids.js';
import { SelectedRoads } from './selected-roads.js';

interface MapStepProps {
  application: AreaApplication;
  existingAreaCount: number;
  onAreasCreated: (areas: Area[]) => void;
  onAddManually: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function MapStep({
  application,
  existingAreaCount,
  onAreasCreated,
  onAddManually,
  onBack,
  onNext,
}: MapStepProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<SelectedRoad[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedIds = new Set(selected.map((road) => road.id));
  // Areas cannot be added once the application is submitted (UC-035 F2).
  const canEdit = canEditAreas(application.status);
  const setFocusId = usePendingFocus(false);

  async function handleNext() {
    // Going back and forth keeps existing areas without new roads.
    if (selected.length === 0) {
      onNext();
      return;
    }

    // Dataforsyningen has no ownership, so the user must choose it (F3).
    const roads = selected.filter(hasOwnership);
    if (roads.length < selected.length) {
      // Focus after the error text is rendered, so screen readers read the
      // first missing road status together with its error.
      setShowErrors(true);
      const missing = selected.find((road) => !road.roadOwnership);
      if (missing) setFocusId(roadOwnershipId(missing.id));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const areas = await createAreas(
        application.caseNumber,
        roads.map((road) => ({
          roadName: road.roadName,
          roadOwnership: road.roadOwnership,
          postalCode: road.postalCode,
        })),
      );
      onAreasCreated(areas);
      setSelected([]);
      setShowErrors(false);
      onNext();
    } catch (error) {
      // The status can change in another tab after the page was loaded.
      setError(
        error instanceof ApiError && error.code === 'APPLICATION_NOT_EDITABLE'
          ? t('areas.notEditable')
          : t('mapStep.createError'),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section aria-labelledby="step-title">
      <Typography
        component="h1"
        id="step-title"
        sx={{ mb: 3 }}
        tabIndex={-1}
        variant="h5"
      >
        {t('mapStep.title')}
      </Typography>
      {!canEdit && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('areas.notEditable')}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
        }}
      >
        <Box sx={{ display: 'grid', gap: 2 }}>
          {canEdit && (
            <RoadSearch
              onToggle={(road) =>
                setSelected((roads) =>
                  roads.some((candidate) => candidate.id === road.id)
                    ? roads.filter((candidate) => candidate.id !== road.id)
                    : [...roads, { ...road, roadOwnership: '' }],
                )
              }
              selectedIds={selectedIds}
            />
          )}
          <MapPlaceholder />
        </Box>

        {canEdit && (
          <Box sx={{ display: 'grid', alignContent: 'start', gap: 3 }}>
            <SelectedRoads
              onOwnershipChange={(road, roadOwnership) =>
                setSelected((roads) =>
                  roads.map((candidate) =>
                    candidate.id === road.id
                      ? { ...candidate, roadOwnership }
                      : candidate,
                  ),
                )
              }
              onRemove={(road) =>
                setSelected((roads) =>
                  roads.filter((candidate) => candidate.id !== road.id),
                )
              }
              roads={selected}
              showErrors={showErrors}
            />
            <Box>
              <Typography sx={{ fontWeight: 600, mb: 1 }} variant="body2">
                {t('mapStep.cannotFindRoad')}
              </Typography>
              <Button onClick={onAddManually} variant="outlined">
                {t('areas.addManually')}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      <WizardFooter
        busy={isSaving}
        nextDisabled={
          canEdit && selected.length === 0 && existingAreaCount === 0
        }
        onBack={onBack}
        onNext={handleNext}
      />
    </section>
  );
}

function hasOwnership(
  road: SelectedRoad,
): road is SelectedRoad & { roadOwnership: RoadOwnership } {
  return road.roadOwnership !== '';
}
