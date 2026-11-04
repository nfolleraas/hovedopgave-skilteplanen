import { Alert, Box, Button, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createAreas } from '../../../../api/areas.api.js';
import type {
  Area,
  AreaApplication,
  RoadSearchResult,
} from '../../../../types/area.types.js';
import { WizardFooter } from '../../components/wizard-footer.js';
import { MapPlaceholder } from './map-placeholder.js';
import { RoadSearch } from './road-search.js';
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
  const [selected, setSelected] = useState<RoadSearchResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedIds = new Set(selected.map((road) => road.id));

  async function handleNext() {
    // Going back and forth keeps existing areas without new roads.
    if (selected.length === 0) {
      onNext();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const areas = await createAreas(
        application.caseNumber,
        selected.map((road) => ({
          roadName: road.roadName,
          roadOwnership: road.roadOwnership,
          postalCode: road.postalCode,
        })),
      );
      onAreasCreated(areas);
      setSelected([]);
      onNext();
    } catch {
      setError(t('mapStep.createError'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section aria-labelledby="step-title">
      <Typography component="h1" id="step-title" sx={{ mb: 3 }} variant="h5">
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
            onSelect={(road) => setSelected((roads) => [...roads, road])}
            selectedIds={selectedIds}
          />
          <MapPlaceholder />
        </Box>

        <Box sx={{ display: 'grid', alignContent: 'start', gap: 3 }}>
          <SelectedRoads
            onRemove={(road) =>
              setSelected((roads) =>
                roads.filter((candidate) => candidate.id !== road.id),
              )
            }
            roads={selected}
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
