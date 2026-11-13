import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Checkbox,
  IconButton,
  List,
  ListItem,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { RoadMarkingDetails } from '../formTypes';
import { PermitTable } from '../PermitTable';
import { getTrafficChangeOptions } from '../permitOptions';
import {
  getTrafficMeasureLabels,
  type TrafficMeasure,
  trafficMeasures,
} from '../trafficMeasures';

export type RoadMarkingProps = {
  value: RoadMarkingDetails;
  onChange: (value: RoadMarkingDetails) => void;
};

/** Collects traffic changes, access details, and safety measures for the road work. */
export function RoadMarkingPage({ value, onChange }: RoadMarkingProps) {
  const { t } = useTranslation();
  const trafficSelect = useRef<{ focus: () => void }>(null);
  const options = getTrafficChangeOptions(t);
  const labels = getTrafficMeasureLabels(t);
  const { trafficChanges, accessWays, trafficPrecautions } = value;

  /** Adds a selected safety measure with its details or removes it by type. */
  function changeMeasure(measure: TrafficMeasure, checked: boolean) {
    onChange({
      ...value,
      trafficPrecautions: checked
        ? [
            ...trafficPrecautions,
            {
              type: measure.type,
              protectionLevel: measure.protection,
              scope: measure.scope,
              description: measure.description,
            },
          ]
        : trafficPrecautions.filter((item) => item.type !== measure.type),
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <Box sx={{ position: 'relative' }}>
        <TextField
          fullWidth
          helperText={t('permit.roadMarking.multiple')}
          id="traffic-changes"
          inputRef={trafficSelect}
          label={t('permit.roadMarking.changes')}
          name="trafficChanges"
          onChange={(event) => {
            const selected = event.target.value;
            onChange({
              ...value,
              trafficChanges:
                typeof selected === 'string' ? selected.split(',') : selected,
            });
          }}
          select
          slotProps={{
            select: {
              multiple: true,
              renderValue: () =>
                t('permit.roadMarking.selectedChanges', {
                  count: trafficChanges.length,
                }),
            },
          }}
          value={trafficChanges}
        >
          {Object.entries(options).map(([option, label]) => (
            <MenuItem
              key={option}
              sx={{
                gap: 1.5,
                minHeight: 44,
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
              }}
              value={option}
            >
              {trafficChanges.includes(option) ? (
                <CheckBoxIcon color="primary" />
              ) : (
                <CheckBoxOutlineBlankIcon />
              )}
              {label}
            </MenuItem>
          ))}
        </TextField>
        {trafficChanges.length > 0 && (
          <List
            aria-label={t('permit.roadMarking.selectedChangesLabel')}
            disablePadding
            sx={{
              mt: 2,
              '@media (min-width: 1920px)': {
                position: 'absolute',
                top: 0,
                left: 'calc(100% + 48px)',
                width: 320,
                mt: 0,
              },
            }}
          >
            {trafficChanges.map((option) => (
              <ListItem
                key={option}
                sx={{
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  bgcolor: '#F7F9FC',
                  borderRadius: 1,
                  '& + &': { mt: 1 },
                }}
              >
                <Typography
                  sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}
                  variant="body2"
                >
                  {options[option] ?? option}
                </Typography>
                <IconButton
                  aria-label={t('permit.roadMarking.removeChange', {
                    change: options[option] ?? option,
                  })}
                  onClick={() => {
                    onChange({
                      ...value,
                      trafficChanges: trafficChanges.filter(
                        (item) => item !== option,
                      ),
                    });
                    trafficSelect.current?.focus();
                  }}
                  size="small"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
      <TextField
        id="access-ways"
        label={t('permit.roadMarking.accessWays')}
        onChange={(event) =>
          onChange({ ...value, accessWays: event.target.value })
        }
        value={accessWays}
      />
      <PermitTable
        columns={[
          { label: t('permit.roadMarking.measureColumn') },
          { label: t('permit.roadMarking.protectionColumn') },
          { label: t('permit.roadMarking.scopeColumn') },
          { label: t('permit.roadMarking.descriptionColumn') },
          { label: t('permit.roadMarking.choiceColumn') },
        ]}
        label={t('permit.roadMarking.measures')}
        rows={trafficMeasures.map((measure) => {
          const text = labels[measure.type];
          const detailsId = `traffic-measure-${measure.type}`;

          return {
            id: measure.type,
            cells: [
              measure.type,
              text.protection,
              text.scope,
              <Box id={detailsId} key="description">
                {text.description}
              </Box>,
              <Checkbox
                checked={trafficPrecautions.some(
                  (item) => item.type === measure.type,
                )}
                key="selection"
                onChange={(_, checked) => changeMeasure(measure, checked)}
                slotProps={{
                  input: {
                    'aria-label': text.name,
                    'aria-describedby': detailsId,
                  },
                }}
              />,
            ],
          };
        })}
      />
    </Box>
  );
}
