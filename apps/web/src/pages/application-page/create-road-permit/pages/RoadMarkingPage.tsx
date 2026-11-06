import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { RoadMarkingDetails } from '../formTypes';
import { type TrafficMeasure, trafficMeasures } from '../trafficMeasures';

const trafficChangeOptions = [
  'Hastighedsbegrænsning - hensyn til vejarbejder',
  'Hastighedsbegrænsning - hensyn til trafikanter',
  'Hastighedsbegrænsning - hensyn til trafikanter og vejarbejder',
  'Ubetinget vigepligt i vejkryds',
  'Standsning og Parkering',
  'Påbud om ensrettet færdsel',
];

export type RoadMarkingProps = {
  value: RoadMarkingDetails;
  onChange: (value: RoadMarkingDetails) => void;
};

export function RoadMarkingPage({ value, onChange }: RoadMarkingProps) {
  const {
    trafficChanges: selectedTrafficChanges,
    accessWays,
    trafficPrecautions,
  } = value;

  const handleCheckboxChange = (measure: TrafficMeasure, checked: boolean) => {
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
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <Typography component={'h2'} variant="h5">
        Afmærkning
      </Typography>
      <Box
        sx={{
          position: 'relative',
        }}
      >
        <TextField
          fullWidth
          helperText="Du kan vælge flere trafikale ændringer."
          id="traffic-changes"
          label="Trafikale ændringer"
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
                `${selectedTrafficChanges.length} ${selectedTrafficChanges.length === 1 ? 'ændring valgt' : 'ændringer valgt'}`,
            },
          }}
          value={selectedTrafficChanges}
        >
          {trafficChangeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              <Checkbox checked={selectedTrafficChanges.includes(option)} />
              <ListItemText primary={option} />
            </MenuItem>
          ))}
        </TextField>
        {selectedTrafficChanges.length > 0 && (
          <List
            aria-label="Valgte trafikale ændringer"
            disablePadding
            sx={{
              position: { xs: 'static', xl: 'absolute' },
              top: 0,
              left: 'calc(100% + 48px)',
              width: { xs: '100%', xl: 320 },
              mt: { xs: 2, xl: 0 },
            }}
          >
            {selectedTrafficChanges.map((option) => (
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
                  {option}
                </Typography>
                <IconButton
                  aria-label={`Fjern ${option}`}
                  onClick={() =>
                    onChange({
                      ...value,
                      trafficChanges: selectedTrafficChanges.filter(
                        (item) => item !== option,
                      ),
                    })
                  }
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
        label="Beskrivelse af adgangsveje"
        onChange={(event) =>
          onChange({ ...value, accessWays: event.target.value })
        }
        value={accessWays}
      />
      <TableContainer sx={{ width: '100%' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Trafikforanstaltning</TableCell>
              <TableCell>Beskyttelsegrad</TableCell>
              <TableCell>Virkeområde</TableCell>
              <TableCell>Foranstaltning</TableCell>
              <TableCell>Valg</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trafficMeasures.map((RowDetails) => (
              <TableRow key={'RowTrafficMeasure_' + RowDetails.type}>
                <TableCell>{RowDetails.type}</TableCell>
                <TableCell>{RowDetails.protection}</TableCell>
                <TableCell>{RowDetails.scope}</TableCell>
                <TableCell>{RowDetails.description}</TableCell>
                <TableCell>
                  <Checkbox
                    checked={trafficPrecautions.some(
                      (item) => item.type === RowDetails.type,
                    )}
                    onChange={(e) =>
                      handleCheckboxChange(RowDetails, e.target.checked)
                    }
                  ></Checkbox>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
