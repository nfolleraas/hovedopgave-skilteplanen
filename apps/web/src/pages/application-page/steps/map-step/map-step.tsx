import { Alert, Box, Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createAreas } from '../../../../api/areas.api.js';
import type {
  Area,
  AreaApplication,
  SelectedRoad,
} from '../../../../types/area.types.js';
import type { RoadOwnership } from '../../../../types/prisma-enums.js';
import { focusById } from '../../../../utils/focus-by-id.js';
import { WizardFooter } from '../../components/wizard-footer.js';
import { MapPlaceholder } from './map-placeholder.js';
import { RoadSearch } from './road-search.js';
import { roadOwnershipId, SelectedRoads } from './selected-roads.js';

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
  // Counts blocked attempts to continue, so each one moves focus again.
  const [ownershipCheck, setOwnershipCheck] = useState(0);

  // Focus the first missing road status after its error text is rendered,
  // so screen readers read the field together with the error.
  // biome-ignore lint/correctness/useExhaustiveDependencies: per attempt only.
  useEffect(() => {
    if (ownershipCheck === 0) return;
    const missing = selected.find((road) => !road.roadOwnership);
    if (missing) focusById(roadOwnershipId(missing.id));
  }, [ownershipCheck]);

  async function handleNext() {
    // Going back and forth keeps existing areas without new roads.
    if (selected.length === 0) {
      onNext();
      return;
    }

    // Dataforsyningen has no ownership, so the user must choose it (F3).
    const roads = selected.filter(hasOwnership);
    if (roads.length < selected.length) {
      setShowErrors(true);
      setOwnershipCheck((count) => count + 1);
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
    } catch {
      setError(t('mapStep.createError'));
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

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' },
        }}
      >
        <Box sx={{ display: 'grid', gap: 2 }}>
          <RoadSearch
            onSelect={(road) =>
              setSelected((roads) => [...roads, { ...road, roadOwnership: '' }])
            }
            selectedIds={selectedIds}
          />
          <MapPlaceholder />
        </Box>

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
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      <WizardFooter
        busy={isSaving}
        nextDisabled={selected.length === 0 && existingAreaCount === 0}
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
