import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { roadOwnershipLabelKeys } from '../../../../features/areas/area-labels.js';
import type { RoadSearchResult } from '../../../../types/area.types.js';

interface SelectedRoadsProps {
  roads: RoadSearchResult[];
  onRemove: (road: RoadSearchResult) => void;
}

export function SelectedRoads({ roads, onRemove }: SelectedRoadsProps) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="selected-roads-title">
      <Typography
        component="h2"
        id="selected-roads-title"
        sx={{ fontWeight: 600, mb: 1 }}
        variant="body1"
      >
        {t('mapStep.selectedRoads')}
      </Typography>
      {roads.length === 0 ? (
        <Typography color="text.secondary" variant="body2">
          {t('mapStep.noSelectedRoads')}
        </Typography>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {roads.map((road) => (
            <Box
              component="li"
              key={road.id}
              sx={{
                alignItems: 'center',
                border: '1px solid #BDBDBD',
                borderRadius: 1,
                display: 'flex',
                gap: 1,
                justifyContent: 'space-between',
                mb: 1,
                px: 1.5,
                py: 1,
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600 }} variant="body2">
                  {road.roadName}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {road.postalCode} {road.city} ·{' '}
                  {t(roadOwnershipLabelKeys[road.roadOwnership])}
                </Typography>
              </Box>
              <Button
                aria-label={t('mapStep.removeRoad', { road: road.roadName })}
                color="error"
                onClick={() => onRemove(road)}
                size="small"
                variant="outlined"
              >
                {t('mapStep.remove')}
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </section>
  );
}
