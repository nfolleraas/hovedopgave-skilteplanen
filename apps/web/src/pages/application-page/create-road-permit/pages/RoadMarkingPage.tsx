import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
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
import { getTrafficChangeLabels } from '../permitOptions';
import {
  getTrafficMeasureLabels,
  type TrafficMeasure,
  trafficMeasures,
} from '../trafficMeasures';

export type RoadMarkingProps = {
  value: RoadMarkingDetails;
  onChange: (value: RoadMarkingDetails) => void;
  onRetryTrafficChanges: () => void;
  trafficChangeChoices: string[] | null | undefined;
  trafficChangeError?: string;
};

/** Collects traffic changes, access details, and safety measures for the road work. */
export function RoadMarkingPage({
  value,
  onChange,
  onRetryTrafficChanges,
  trafficChangeChoices,
  trafficChangeError,
}: RoadMarkingProps) {
  const { t } = useTranslation();
  const trafficSelect = useRef<{ focus: () => void }>(null);
  const trafficChangeLabels = getTrafficChangeLabels(t);
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
      <Box>
        <TextField
          disabled={!trafficChangeChoices?.length}
          error={Boolean(trafficChangeError)}
          fullWidth
          helperText={
            trafficChangeError ??
            (trafficChangeChoices === undefined
              ? t('permit.roadMarking.loadingChanges')
              : t('permit.roadMarking.multiple'))
          }
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
          {trafficChangeChoices?.map((option) => (
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
              {trafficChangeLabels[option] ?? option}
            </MenuItem>
          ))}
        </TextField>
        {trafficChangeChoices === null && (
          <Alert
            action={
              <Button onClick={onRetryTrafficChanges}>
                {t('permit.roadMarking.retryChanges')}
              </Button>
            }
            severity="error"
            sx={{ mt: 1 }}
          >
            {t('permit.roadMarking.loadChangesError')}
          </Alert>
        )}
        {trafficChanges.length > 0 && (
          <List
            aria-label={t('permit.roadMarking.selectedChangesLabel')}
            disablePadding
            sx={{ mt: 2 }}
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
                  {trafficChangeLabels[option] ?? option}
                </Typography>
                <IconButton
                  aria-label={t('permit.roadMarking.removeChange', {
                    change: trafficChangeLabels[option] ?? option,
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
      <Box component="fieldset" sx={{ border: 0, m: 0, minWidth: 0, p: 0 }}>
        <Typography
          color="text.secondary"
          component="legend"
          sx={{ mb: 1, p: 0 }}
          variant="body2"
        >
          {t('permit.errors.trafficMeasureRequired')}
        </Typography>
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
    </Box>
  );
}
