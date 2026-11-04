import {
  Box, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import type { RoadMarking } from '../formTypes';
import { trafficMeasures } from '../trafficMeasures';

type RoadMarkingPageProps = {
  value: RoadMarking;
  onChange: (value: RoadMarking) => void;
};

export function RoadMarkingPage({ value, onChange }: RoadMarkingPageProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography component="h2" variant="h5">Afmærkning</Typography>
      <Typography color="text.secondary" variant="body2">
        Her vælges afmærkning af vejarbejdet, herunder om nedsættelsen af
        hastighedsbegrænsningen skyldes hensynet til trafikanterne eller
        vejarbejdernes sikkerhed.
      </Typography>
      <TextField
        fullWidth
        id="traffic-changes"
        label="Trafikale ændringer"
        onChange={(event) => onChange({ ...value, trafficChanges: event.target.value })}
        value={value.trafficChanges}
      />
      <TextField
        fullWidth
        id="access-description"
        label="Beskrivelse af adgangsveje"
        minRows={3}
        multiline
        onChange={(event) => onChange({ ...value, accessDescription: event.target.value })}
        value={value.accessDescription}
      />
      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table aria-label="Trafikforanstaltninger" size="small" sx={{ minWidth: 680 }}>
          <TableHead sx={{ bgcolor: '#F7F9FC' }}>
            <TableRow>
              <TableCell>Trafikforanstaltning</TableCell>
              <TableCell>Beskyttelsesgrad</TableCell>
              <TableCell>Virkeområde</TableCell>
              <TableCell>Foranstaltning</TableCell>
              <TableCell align="center">Valg</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trafficMeasures.map((measure) => (
              <TableRow key={measure.id} selected={value.measures.includes(measure.id)}>
                <TableCell component="th" scope="row">{measure.id}</TableCell>
                <TableCell>{measure.protection}</TableCell>
                <TableCell>{measure.scope}</TableCell>
                <TableCell sx={{ minWidth: 260 }}>{measure.description}</TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={value.measures.includes(measure.id)}
                    onChange={(_, checked) => onChange({
                      ...value,
                      measures: checked ? [...value.measures, measure.id] : value.measures.filter((id) => id !== measure.id),
                    })}
                    slotProps={{ input: { 'aria-label': `Vælg trafikforanstaltning ${measure.id}` } }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
        <TextField
          fullWidth
          id="first-sign-location"
          label="Første tavlenists placering"
          onChange={(event) => onChange({ ...value, firstSignLocation: event.target.value })}
          value={value.firstSignLocation}
        />
        <TextField
          fullWidth
          id="last-sign-location"
          label="Sidste tavlenists placering"
          onChange={(event) => onChange({ ...value, lastSignLocation: event.target.value })}
          value={value.lastSignLocation}
        />
      </Box>
      <TextField
        fullWidth
        id="working-hours"
        label="Beskrivelse af daglig arbejdstid"
        minRows={2}
        multiline
        onChange={(event) => onChange({ ...value, workingHours: event.target.value })}
        value={value.workingHours}
      />
    </Box>
  );
}
