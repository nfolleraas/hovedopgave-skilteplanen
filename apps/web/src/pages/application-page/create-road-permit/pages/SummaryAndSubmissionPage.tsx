import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { municipalities } from '../../../../data/municipalities';
import type {
  CompanyInformation,
  ContactInformation,
  MaterialEntry,
  RoadMarkingDetails,
  UsageDetails,
} from '../formTypes';

type SummaryAndSubmissionPageProps = {
  title: string;
  municipalityId: string | null;
  materials: MaterialEntry[];
  usageDetails: UsageDetails;
  contactInformation: ContactInformation;
  roadMarking: RoadMarkingDetails;
  applicant: CompanyInformation;
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
};

const applicantFields = [
  ['name', 'Navn'],
  ['department', 'Afdeling'],
  ['address1', 'Adresse 1'],
  ['address2', 'Adresse 2'],
  ['postalCode', 'Postnr.'],
  ['city', 'By'],
  ['contactPerson', 'Kontaktperson'],
  ['directPhone', 'Direkte telefon'],
  ['mobile', 'Mobil'],
  ['email', 'E-mail'],
  ['companyPhone', 'Firma telefon'],
  ['cvr', 'CVR-nummer'],
] as const;

function SummaryGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
        },
        gap: 2,
      }}
    >
      {children}
    </Box>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box
      aria-label={title}
      component="section"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography component="h3" variant="h6">
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function formatDate(date: string) {
  return date.split('-').reverse().join('-');
}

export function SummaryAndSubmissionPage({
  title,
  municipalityId,
  materials,
  usageDetails,
  contactInformation,
  roadMarking,
  applicant,
  confirmed,
  onConfirmedChange,
}: SummaryAndSubmissionPageProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography component="h2" variant="h5">
        Opsummering &amp; indsendelse
      </Typography>
      <SummaryGrid>
        <TextField
          fullWidth
          label="Titel"
          size="small"
          slotProps={{ input: { readOnly: true } }}
          value={title || '—'}
        />
        <TextField
          fullWidth
          label="Kommune"
          size="small"
          slotProps={{ input: { readOnly: true } }}
          value={
            (municipalities.find(
              (municipality) => municipality.id === municipalityId,
            )?.name ??
              '') ||
            '—'
          }
        />
        <TextField
          fullWidth
          label="Startdato"
          size="small"
          slotProps={{ input: { readOnly: true } }}
          value={formatDate(usageDetails.startDate) || '—'}
        />
        <TextField
          fullWidth
          label="Slutdato"
          size="small"
          slotProps={{ input: { readOnly: true } }}
          value={formatDate(usageDetails.endDate) || '—'}
        />
      </SummaryGrid>
      <TextField
        fullWidth
        label="Anvendelse"
        size="small"
        slotProps={{ input: { readOnly: true } }}
        value={usageDetails.usage || '—'}
      />
      <Divider />
      <SummarySection title="Materialeliste">
        {materials.length > 0 ? (
          <TableContainer>
            <Table aria-label="Tilføjede materialer" size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Materiale</TableCell>
                  <TableCell align="right">Antal</TableCell>
                  <TableCell>Bemærkninger</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>{material.type}</TableCell>
                    <TableCell align="right">{material.quantity}</TableCell>
                    <TableCell sx={{ overflowWrap: 'anywhere' }}>
                      {material.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" variant="body2">
            Ingen materialer tilføjet.
          </Typography>
        )}
      </SummarySection>

      <Divider />
      <SummarySection title="Kontaktoplysninger">
        <SummaryGrid>
          <TextField
            fullWidth
            label="Navn"
            size="small"
            slotProps={{ input: { readOnly: true } }}
            value={contactInformation.name || '—'}
          />
          <TextField
            fullWidth
            label="Mobil"
            size="small"
            slotProps={{ input: { readOnly: true } }}
            value={contactInformation.phone || '—'}
          />
          <TextField
            fullWidth
            label="E-mail"
            size="small"
            slotProps={{ input: { readOnly: true } }}
            value={contactInformation.email || '—'}
          />
        </SummaryGrid>
        <SummaryGrid>
          <TextField
            fullWidth
            label="Tilgængelig fra"
            size="small"
            slotProps={{ input: { readOnly: true } }}
            value={contactInformation.availableFrom || '—'}
          />
          <TextField
            fullWidth
            label="Tilgængelig til"
            size="small"
            slotProps={{ input: { readOnly: true } }}
            value={contactInformation.availableTo || '—'}
          />
        </SummaryGrid>
        <TextField
          fullWidth
          label="Evt. bemærkning til tilgængelighed"
          multiline
          size="small"
          slotProps={{ input: { readOnly: true } }}
          value={contactInformation.availabilityNotes || '—'}
        />
      </SummarySection>

      <Divider />
      <SummarySection title="Steddetaljer">
        <TextField
          fullWidth
          label="Vej"
          size="small"
          slotProps={{ input: { readOnly: true } }}
          value={usageDetails.road || '—'}
        />
        <SummaryGrid>
          <TextField
            fullWidth
            label="Husnr. fra"
            size="small"
            slotProps={{ input: { readOnly: true } }}
            value={usageDetails.houseNumberFrom || '—'}
          />
          <TextField
            fullWidth
            label="Husnr. til"
            size="small"
            slotProps={{ input: { readOnly: true } }}
            value={usageDetails.houseNumberTo || '—'}
          />
        </SummaryGrid>
        <TextField
          fullWidth
          label="Yderligere beskrivelse"
          multiline
          size="small"
          slotProps={{ input: { readOnly: true } }}
          value={usageDetails.locationDescription || '—'}
        />
      </SummarySection>

      <Divider />
      <SummarySection title="Afmærkning">
        <TextField
          fullWidth
          label="Trafikale ændringer"
          multiline
          size="small"
          slotProps={{ input: { readOnly: true } }}
          value={roadMarking.trafficChanges.join('\n') || '—'}
        />
        <TextField
          fullWidth
          label="Beskrivelse af adgangsveje"
          multiline
          size="small"
          slotProps={{ input: { readOnly: true } }}
          value={roadMarking.accessWays || '—'}
        />
        <Typography component="h4" sx={{ fontWeight: 600 }} variant="body1">
          Valgte trafikforanstaltninger
        </Typography>
        {roadMarking.trafficPrecautions.length > 0 ? (
          <TableContainer>
            <Table aria-label="Valgte trafikforanstaltninger" size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Trafikforanstaltning</TableCell>
                  <TableCell>Beskyttelsesgrad</TableCell>
                  <TableCell>Virkeområde</TableCell>
                  <TableCell>Foranstaltning</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {roadMarking.trafficPrecautions.map((precaution) => (
                  <TableRow key={precaution.type}>
                    <TableCell>{precaution.type}</TableCell>
                    <TableCell>{precaution.protectionLevel}</TableCell>
                    <TableCell>{precaution.scope}</TableCell>
                    <TableCell sx={{ overflowWrap: 'anywhere' }}>
                      {precaution.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary" variant="body2">
            Ingen trafikforanstaltninger valgt.
          </Typography>
        )}
      </SummarySection>

      <Divider />
      <SummarySection title="Ansøger">
        <SummaryGrid>
          {applicantFields.map(([key, label]) => (
            <TextField
              fullWidth
              key={key}
              label={label}
              size="small"
              slotProps={{ input: { readOnly: true } }}
              value={applicant[key] || '—'}
            />
          ))}
        </SummaryGrid>
      </SummarySection>

      <Divider />
      <SummarySection title="Bekræft oplysninger">
        <FormControlLabel
          control={
            <Checkbox
              checked={confirmed}
              onChange={(event) => onConfirmedChange(event.target.checked)}
            />
          }
          label="Jeg bekræfter, at oplysningerne er korrekte og afgivet på tro og love."
          sx={{ alignItems: 'flex-start', mx: 0 }}
        />
      </SummarySection>
    </Box>
  );
}
