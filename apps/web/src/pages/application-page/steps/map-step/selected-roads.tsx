import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  areaFieldLabelKeys,
  roadOwnershipLabelKeys,
} from '../../../../features/areas/area-labels.js';
import type { SelectedRoad } from '../../../../types/area.types.js';
import { RoadOwnership } from '../../../../types/prisma-enums.js';

interface SelectedRoadsProps {
  roads: SelectedRoad[];
  /** Marks roads without an ownership after the user tried to continue. */
  showErrors: boolean;
  onOwnershipChange: (road: SelectedRoad, ownership: RoadOwnership) => void;
  onRemove: (road: SelectedRoad) => void;
}

export function SelectedRoads({
  roads,
  showErrors,
  onOwnershipChange,
  onRemove,
}: SelectedRoadsProps) {
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
          {roads.map((road) => {
            const missingOwnership = showErrors && !road.roadOwnership;
            return (
              <Box
                component="li"
                key={road.id}
                sx={{
                  border: '1px solid #BDBDBD',
                  borderRadius: 1,
                  display: 'grid',
                  gap: 1.5,
                  mb: 1,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Box
                  sx={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: 1,
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }} variant="body2">
                      {road.roadName}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {road.postalCode} {road.city}
                    </Typography>
                  </Box>
                  <Button
                    aria-label={t('mapStep.removeRoad', {
                      road: road.roadName,
                    })}
                    color="error"
                    onClick={() => onRemove(road)}
                    size="small"
                    variant="outlined"
                  >
                    {t('mapStep.remove')}
                  </Button>
                </Box>
                <TextField
                  error={missingOwnership}
                  helperText={
                    missingOwnership ? t('mapStep.ownershipRequired') : ' '
                  }
                  id={`road-ownership-${road.id}`}
                  label={t(areaFieldLabelKeys.roadOwnership)}
                  onChange={(event) =>
                    onOwnershipChange(road, event.target.value as RoadOwnership)
                  }
                  required
                  select
                  size="small"
                  value={road.roadOwnership}
                >
                  {Object.values(RoadOwnership).map((ownership) => (
                    <MenuItem key={ownership} value={ownership}>
                      {t(roadOwnershipLabelKeys[ownership])}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            );
          })}
        </Box>
      )}
    </section>
  );
}
