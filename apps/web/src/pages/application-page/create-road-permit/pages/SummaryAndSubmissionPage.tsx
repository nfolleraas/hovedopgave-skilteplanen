import DeleteIcon from '@mui/icons-material/Delete';
import {
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { visuallyHidden } from '../../../../components/ui/visuallyHidden';
import type {
  CompanyInformation,
  ContactInformation,
  MaterialEntry,
  RoadMarkingDetails,
  UsageDetails,
} from '../formTypes';
import { PermitTable } from '../PermitTable';
import {
  getMaterialTypes,
  getTrafficChangeOptions,
  getUsageTypes,
} from '../permitOptions';
import { getTrafficMeasureLabels } from '../trafficMeasures';

type SummaryAndSubmissionPageProps = {
  title: string;
  municipalityName: string | null;
  materials: MaterialEntry[];
  usageDetails: UsageDetails;
  contactInformation: ContactInformation;
  roadMarking: RoadMarkingDetails;
  applicant: CompanyInformation;
  documentToUpload: any;
  confirmed: boolean;
  confirmationError?: string;
  submissionAttempted: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
};

function SummaryFacts({
  entries,
  singleColumn,
}: {
  entries: [string, ReactNode][];
  singleColumn?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: singleColumn ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
        },
        gap: 2,
      }}
    >
      {entries.map(([label, value]) => (
        <Box
          key={label}
          sx={{
            border: 1,
            borderColor: 'text.secondary',
            borderRadius: 1,
            px: 1.75,
            mt: 0.75,
            overflowWrap: 'anywhere',
          }}
        >
          <Typography
            component="dt"
            sx={{
              mt: '-0.75em',
              px: 0.5,
              mx: -0.5,
              width: 'fit-content',
              maxWidth: '100%',
              bgcolor: 'background.paper',
              color: 'text.secondary',
            }}
            variant="body2"
          >
            {label}
          </Typography>
          <Typography
            component="dd"
            sx={{ m: 0, py: 0.75, whiteSpace: 'pre-wrap' }}
          >
            {value || (
              <>
                <Box aria-hidden="true" component="span">
                  —
                </Box>
                <Box component="span" sx={visuallyHidden}>
                  {t('permit.summary.notProvided')}
                </Box>
              </>
            )}
          </Typography>
        </Box>
      ))}
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
  const headingId = useId();
  return (
    <Box
      aria-labelledby={headingId}
      component="section"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography component="h3" id={headingId} variant="h6">
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export function SummaryAndSubmissionPage({
  title,
  municipalityName,
  materials,
  usageDetails,
  contactInformation,
  roadMarking,
  applicant,
  confirmed,
  documentToUpload,
  confirmationError,
  submissionAttempted,
  onConfirmedChange,
}: SummaryAndSubmissionPageProps) {
  const { t, i18n } = useTranslation();
  const materialTypes = getMaterialTypes(t);
  const usageTypes = getUsageTypes(t);
  const trafficChanges = getTrafficChangeOptions(t);
  const trafficMeasures = getTrafficMeasureLabels(t);
  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  const formatDate = (date: string) => {
    if (!date) return '';
    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime())
      ? date
      : dateFormat.format(parsedDate);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SummaryFacts
          entries={[
            [t('permit.municipality.title'), title],
            [t('permit.municipality.label'), municipalityName],
            [t('permit.usage.startDate'), formatDate(usageDetails.startDate)],
            [t('permit.usage.endDate'), formatDate(usageDetails.endDate)],
          ]}
        />
        <SummaryFacts
          entries={[
            [
              t('permit.usage.label'),
              usageTypes[usageDetails.usage] ?? usageDetails.usage,
            ],
          ]}
          singleColumn
        />
      </Box>
      <Divider />
      <SummarySection title={t('permit.materials.list')}>
        {materials.length > 0 ? (
          <PermitTable
            columns={[
              { label: t('permit.steps.materials') },
              { label: t('permit.materials.quantity'), align: 'right' },
              { label: t('permit.materials.notes') },
            ]}
            label={t('permit.materials.list')}
            rows={materials.map((material) => ({
              id: material.id,
              cells: [
                materialTypes[material.type] ?? material.type,
                material.quantity,
                material.notes || '—',
              ],
            }))}
          />
        ) : (
          <Typography>{t('permit.materials.empty')}</Typography>
        )}
      </SummarySection>
      <Divider />
      <SummarySection title={t('permit.steps.contact')}>
        <SummaryFacts
          entries={[
            [t('permit.contact.name'), contactInformation.name],
            [t('permit.contact.phone'), contactInformation.phone],
            [t('permit.contact.email'), contactInformation.email],
          ]}
        />
      </SummarySection>
      <Divider />
      <SummarySection title={t('permit.usage.location')}>
        <SummaryFacts
          entries={[
            [t('permit.usage.road'), usageDetails.road],
            [t('permit.usage.houseNumberFrom'), usageDetails.houseNumberFrom],
            [t('permit.usage.houseNumberTo'), usageDetails.houseNumberTo],
            [t('permit.usage.postalCode'), usageDetails.postalCode],
            [t('permit.usage.city'), usageDetails.city],
            [
              t('permit.usage.locationDescription'),
              usageDetails.locationDescription,
            ],
          ]}
        />
      </SummarySection>
      <Divider />
      <SummarySection title={t('permit.steps.roadMarking')}>
        <SummaryFacts
          entries={[
            [
              t('permit.roadMarking.changes'),
              roadMarking.trafficChanges
                .map((option) => trafficChanges[option] ?? option)
                .join('\n'),
            ],
            [t('permit.roadMarking.accessWays'), roadMarking.accessWays],
          ]}
        />
        <Typography component="h4" variant="h6">
          {t('permit.roadMarking.selectedMeasures')}
        </Typography>
        {roadMarking.trafficPrecautions.length > 0 ? (
          <PermitTable
            columns={[
              { label: t('permit.roadMarking.measureColumn') },
              { label: t('permit.roadMarking.protectionColumn') },
              { label: t('permit.roadMarking.scopeColumn') },
              { label: t('permit.roadMarking.descriptionColumn') },
            ]}
            label={t('permit.roadMarking.selectedMeasures')}
            rows={roadMarking.trafficPrecautions.map((measure) => ({
              id: measure.type,
              cells: [
                measure.type,
                trafficMeasures[measure.type]?.protection ??
                  measure.protectionLevel,
                trafficMeasures[measure.type]?.scope ?? measure.scope,
                trafficMeasures[measure.type]?.description ??
                  measure.description,
              ],
            }))}
          />
        ) : (
          <Typography>{t('permit.roadMarking.noMeasures')}</Typography>
        )}
      </SummarySection>
      <Divider />
      <SummarySection title={t('permit.steps.documents')}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Navn</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Dato</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{documentToUpload.name}</TableCell>
                <TableCell>{documentToUpload.DocumentType}</TableCell>
                <TableCell>{documentToUpload.DateForUpload}</TableCell>
                <TableCell>
                  <IconButton
                    aria-label={t('permit.actions.remove')}
                    type="button"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </SummarySection>
      <Divider />
      <SummarySection title={t('permit.summary.exampleApplicant')}>
        <SummaryFacts
          entries={[
            [t('permit.contact.name'), applicant.name],
            [t('permit.summary.department'), applicant.department],
            [t('permit.summary.address1'), applicant.address1],
            [t('permit.summary.address2'), applicant.address2],
            [t('permit.summary.postalCode'), applicant.postalCode],
            [t('permit.summary.city'), applicant.city],
            [t('permit.summary.contactPerson'), applicant.contactPerson],
            [t('permit.summary.directPhone'), applicant.directPhone],
            [t('permit.summary.mobile'), applicant.mobile],
            [t('permit.contact.email'), applicant.email],
            [t('permit.summary.companyPhone'), applicant.companyPhone],
            [t('permit.summary.cvr'), applicant.cvr],
          ]}
        />
      </SummarySection>
      <Divider />
      <SummarySection title={t('permit.summary.confirmTitle')}>
        <FormControlLabel
          control={
            <Checkbox
              checked={confirmed}
              onChange={(event) => onConfirmedChange(event.target.checked)}
              required
              slotProps={{
                input: {
                  'aria-describedby': confirmationError
                    ? 'application-confirmation-error'
                    : undefined,
                  'aria-invalid': Boolean(confirmationError),
                },
              }}
            />
          }
          label={t('permit.summary.confirmLabel')}
          sx={{ alignItems: 'flex-start', mx: 0, minHeight: 44 }}
        />
        {confirmationError && (
          <FormHelperText error id="application-confirmation-error">
            {confirmationError}
          </FormHelperText>
        )}
        <Typography role="status">
          {submissionAttempted && t('permit.summary.submissionStatus')}
        </Typography>
      </SummarySection>
    </Box>
  );
}
