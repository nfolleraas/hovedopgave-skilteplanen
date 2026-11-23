import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
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
  useMediaQuery,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { visuallyHidden } from '../../../../components/ui/visuallyHidden';
import type {
  CompanyInformation,
  ContactInformation,
  MaterialEntry,
  RoadMarkingDetails,
  SubmissionStatus,
  UsageDetails,
} from '../formTypes';
import { PermitTable } from '../PermitTable';
import {
  getMaterialTypes,
  getTrafficChangeLabels,
  getUsageTypes,
} from '../permitOptions';
import { getTrafficMeasureLabels } from '../trafficMeasures';
import type {
  validateContactInformation,
  validateMunicipalityAndTitle,
  validateUsageDetails,
} from '../validation';

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
  validationErrors?: {
    municipality: ReturnType<typeof validateMunicipalityAndTitle>;
    usage: ReturnType<typeof validateUsageDetails>;
    contact: ReturnType<typeof validateContactInformation>;
    materials: string[];
    trafficChange?: string;
    trafficMeasure?: string;
  };
  submissionError?: string;
  submissionStatus: SubmissionStatus;
  onConfirmedChange: (confirmed: boolean) => void;
  onSubmissionComplete: () => void;
};

const checkmarkDuration = 220;
const confirmationDisplayTime = 700;

/** Displays label-value pairs with an accessible message for missing information. */
function SummaryFacts({
  entries,
  singleColumn,
}: {
  entries: [label: string, value: ReactNode, error?: string][];
  singleColumn?: boolean;
}) {
  const { t } = useTranslation();
  const factsId = useId();
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
      {entries.map(([label, value, error], index) => (
        <Box
          aria-describedby={error ? `${factsId}-${index}-error` : undefined}
          aria-labelledby={error ? `${factsId}-${index}-label` : undefined}
          data-summary-error={error ? '' : undefined}
          key={label}
          role={error ? 'group' : undefined}
          sx={{
            border: 1,
            borderColor: error ? 'error.dark' : 'text.secondary',
            bgcolor: error
              ? (theme) => alpha(theme.palette.error.main, 0.07)
              : undefined,
            borderRadius: 1,
            px: 1.75,
            mt: 0.75,
            overflowWrap: 'anywhere',
          }}
          tabIndex={error ? -1 : undefined}
        >
          <Typography
            component="dt"
            id={`${factsId}-${index}-label`}
            sx={{
              mt: '-0.75em',
              px: 0.5,
              mx: -0.5,
              width: 'fit-content',
              maxWidth: '100%',
              bgcolor: 'background.paper',
              color: error ? 'error.dark' : 'text.secondary',
            }}
            variant="body2"
          >
            {label}
          </Typography>
          <Typography
            component="dd"
            sx={{ m: 0, py: 0.75, whiteSpace: 'pre-wrap' }}
          >
            {value ||
              (!error && (
                <>
                  <Box aria-hidden="true" component="span">
                    —
                  </Box>
                  <Box component="span" sx={visuallyHidden}>
                    {t('permit.summary.notProvided')}
                  </Box>
                </>
              ))}
            {error && (
              <Typography
                color="error.dark"
                component="span"
                id={`${factsId}-${index}-error`}
                sx={{ display: 'block' }}
                variant="body2"
              >
                {error}
              </Typography>
            )}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function SummaryIssue({ message }: { message: string }) {
  return (
    <Typography
      color="error.dark"
      data-summary-error=""
      sx={(theme) => ({
        bgcolor: alpha(theme.palette.error.main, 0.07),
        border: 1,
        borderColor: 'error.dark',
        borderRadius: 1,
        p: 1.75,
      })}
      tabIndex={-1}
    >
      {message}
    </Typography>
  );
}

/** Groups related summary details under an accessible heading. */
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

/** Displays the permit details for review and reports the submission result. */
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
  validationErrors,
  submissionError,
  submissionStatus,
  onConfirmedChange,
  onSubmissionComplete,
}: SummaryAndSubmissionPageProps) {
  const { t, i18n } = useTranslation();
  const submissionTitleId = useId();
  const submissionResultRef = useRef<HTMLParagraphElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const submitted = submissionStatus === 'success';
  const animationDuration = reduceMotion ? 0 : checkmarkDuration;
  const submissionDialogOpen = submissionStatus === 'sending' || submitted;

  useEffect(() => {
    if (!submitted) return;

    // Give the success message a moment on screen after the checkmark appears.
    const redirect = window.setTimeout(
      onSubmissionComplete,
      animationDuration + confirmationDisplayTime,
    );
    return () => window.clearTimeout(redirect);
  }, [animationDuration, onSubmissionComplete, submitted]);

  const submissionMessage = submitted
    ? t('permit.summary.submissionSuccess')
    : t('permit.summary.submissionPending');
  const materialTypes = getMaterialTypes(t);
  const usageTypes = getUsageTypes(t);
  const trafficChanges = getTrafficChangeLabels(t);
  const trafficMeasures = getTrafficMeasureLabels(t);
  const materialError = validationErrors?.materials.join(' ');
  const hasValidationErrors =
    validationErrors &&
    (Boolean(materialError) ||
      Boolean(validationErrors.trafficChange) ||
      Boolean(validationErrors.trafficMeasure) ||
      Object.values(validationErrors.municipality).some(Boolean) ||
      Object.values(validationErrors.usage).some(Boolean) ||
      Object.values(validationErrors.contact).some(Boolean));
  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  /** Formats a valid date in the selected language using UTC to preserve the calendar day. */
  const formatDate = (date: string) => {
    if (!date) return '';
    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime())
      ? date
      : dateFormat.format(parsedDate);
  };

  return (
    <Box
      ref={summaryRef}
      sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SummaryFacts
          entries={[
            [
              t('permit.municipality.title'),
              title,
              validationErrors?.municipality.title,
            ],
            [
              t('permit.municipality.label'),
              municipalityName,
              validationErrors?.municipality.municipality,
            ],
            [
              t('permit.usage.startDate'),
              formatDate(usageDetails.startDate),
              validationErrors?.usage.startDate,
            ],
            [
              t('permit.usage.endDate'),
              formatDate(usageDetails.endDate),
              validationErrors?.usage.endDate,
            ],
          ]}
        />
        <SummaryFacts
          entries={[
            [
              t('permit.usage.label'),
              usageTypes[usageDetails.usage] ?? usageDetails.usage,
              validationErrors?.usage.usage,
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
          !materialError && (
            <Typography>{t('permit.materials.empty')}</Typography>
          )
        )}
        {materialError && <SummaryIssue message={materialError} />}
      </SummarySection>
      <Divider />
      <SummarySection title={t('permit.steps.contact')}>
        <SummaryFacts
          entries={[
            [
              t('permit.contact.name'),
              contactInformation.name,
              validationErrors?.contact.name,
            ],
            [
              t('permit.contact.phone'),
              contactInformation.phone,
              validationErrors?.contact.phone,
            ],
            [
              t('permit.contact.email'),
              contactInformation.email,
              validationErrors?.contact.email,
            ],
          ]}
        />
      </SummarySection>
      <Divider />
      <SummarySection title={t('permit.usage.location')}>
        <SummaryFacts
          entries={[
            [
              t('permit.usage.road'),
              usageDetails.road,
              validationErrors?.usage.road,
            ],
            [
              t('permit.usage.houseNumberFrom'),
              usageDetails.houseNumberFrom,
              validationErrors?.usage.houseNumberFrom,
            ],
            [
              t('permit.usage.houseNumberTo'),
              usageDetails.houseNumberTo,
              validationErrors?.usage.houseNumberTo,
            ],
            [
              t('permit.usage.postalCode'),
              usageDetails.postalCode,
              validationErrors?.usage.postalCode,
            ],
            [
              t('permit.usage.city'),
              usageDetails.city,
              validationErrors?.usage.city,
            ],
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
              validationErrors?.trafficChange,
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
        ) : validationErrors?.trafficMeasure ? (
          <SummaryIssue message={validationErrors.trafficMeasure} />
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
        {(hasValidationErrors || submissionError) && (
          <Alert
            action={
              hasValidationErrors && (
                <Button
                  onClick={() => {
                    const firstError =
                      summaryRef.current?.querySelector<HTMLElement>(
                        '[data-summary-error]',
                      );
                    firstError?.focus({ preventScroll: true });
                    firstError?.scrollIntoView({
                      behavior: reduceMotion ? 'instant' : 'smooth',
                      block: 'center',
                    });
                  }}
                  size="small"
                  sx={{ color: 'primary.main', minHeight: 36 }}
                  variant="text"
                >
                  {t('permit.summary.seeMissingFields')}
                </Button>
              )
            }
            ref={submissionResultRef}
            severity="error"
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
              '& .MuiAlert-action': { py: 0 },
            }}
            tabIndex={submissionError ? -1 : undefined}
          >
            {submissionError ?? t('permit.summary.validationError')}
          </Alert>
        )}
      </SummarySection>
      <Dialog
        aria-labelledby={submissionTitleId}
        fullWidth
        maxWidth="xs"
        open={submissionDialogOpen}
        slotProps={{
          transition: {
            onExited: () =>
              submissionResultRef.current?.focus({ preventScroll: true }),
          },
        }}
        transitionDuration={reduceMotion ? 0 : undefined}
      >
        <DialogContent sx={{ display: 'grid', justifyItems: 'center', pt: 4 }}>
          <Box
            aria-hidden="true"
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 72,
              height: 72,
              '& > *': {
                gridArea: '1 / 1',
                transition: `opacity ${animationDuration}ms ease, transform ${animationDuration}ms ease`,
              },
              '@media (prefers-reduced-motion: reduce)': {
                '& .MuiCircularProgress-root, & .MuiCircularProgress-circle': {
                  animation: 'none',
                },
              },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                opacity: submitted ? 0 : 1,
                transform: submitted ? 'scale(0.7)' : 'scale(1)',
                '& .MuiCircularProgress-root, & .MuiCircularProgress-circle': {
                  animationPlayState: submitted ? 'paused' : undefined,
                },
              }}
            >
              <CircularProgress size={56} />
            </Box>
            <Box
              sx={{
                display: 'grid',
                placeItems: 'center',
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'success.dark',
                color: 'success.contrastText',
                opacity: submitted ? 1 : 0,
                animation:
                  submitted && animationDuration
                    ? `showSubmissionCheck ${animationDuration}ms ease both`
                    : undefined,
                '@keyframes showSubmissionCheck': {
                  from: { opacity: 0, transform: 'scale(0.65)' },
                  to: { opacity: 1, transform: 'scale(1)' },
                },
              }}
            >
              <CheckRoundedIcon sx={{ fontSize: 40 }} />
            </Box>
          </Box>
          <DialogTitle
            component="h2"
            id={submissionTitleId}
            sx={{ px: 0, pb: 0, textAlign: 'center' }}
          >
            <span role="status">{submissionMessage}</span>
          </DialogTitle>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
