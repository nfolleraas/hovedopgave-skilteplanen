import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApplicationDraft } from '../../../../features/application-draft/application-draft.js';
import {
  hasErrors,
  validateActors,
  validateContactPersons,
  validatePeriod,
  validateSignPlanAndTraffic,
  validateTasks,
} from '../../../../features/application-draft/draft-validation.js';
import { roadOwnershipLabelKeys } from '../../../../features/areas/area-labels.js';
import type { Area, AreaApplication } from '../../../../types/area.types.js';
import { ApplicationType } from '../../../../types/prisma-enums.js';
import type { ApplicationStepId } from '../../application-steps.js';
import { WizardFooter } from '../../components/wizard-footer.js';

interface SummaryStepProps {
  application: AreaApplication;
  draft: ApplicationDraft;
  areas: Area[];
  onBack: () => void;
  onGoTo: (step: ApplicationStepId) => void;
}

/** Overview of the whole application before it is sent (UC-004 step 28). */
export function SummaryStep({
  application,
  draft,
  areas,
  onBack,
  onGoTo,
}: SummaryStepProps) {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const { type } = application;
  const { period } = draft;
  const enumLabel = (name: string, value: string) =>
    value ? t(`wizard.enums.${name}.${value}`) : '–';
  const text = (value: string) => value.trim() || '–';

  const incomplete: Record<string, boolean> = {
    municipalityAndPeriod: hasErrors(validatePeriod(type, period)),
    tasks: hasErrors(validateTasks(type, draft)),
    otherActors: hasErrors(validateActors(draft)),
    contactInfo: hasErrors(validateContactPersons(draft)),
    areas: areas.length === 0,
    signPlanAndTraffic: hasErrors(validateSignPlanAndTraffic(draft)),
  };
  const anyIncomplete = Object.values(incomplete).some(Boolean);

  function section(step: ApplicationStepId, children: ReactNode) {
    return (
      <SummarySection
        incomplete={incomplete[step] ?? false}
        onEdit={() => onGoTo(step)}
        title={t(`applicationWizard.steps.${step}`)}
      >
        {children}
      </SummarySection>
    );
  }

  return (
    <section aria-labelledby="step-title">
      <Typography
        component="h1"
        id="step-title"
        sx={{ mb: 1 }}
        tabIndex={-1}
        variant="h5"
      >
        {t('applicationWizard.steps.summary')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t('wizard.summary.intro', { caseNumber: application.caseNumber })}
      </Typography>

      <Box sx={{ display: 'grid', gap: 2 }}>
        {section(
          'municipalityAndPeriod',
          <>
            <Row label={t('wizard.summary.applicationType')}>
              {t(`areas.labels.applicationType.${type}`)}
            </Row>
            <Row label={t('wizard.period.municipality')}>
              {text(period.municipality)}
            </Row>
            <Row label={t('wizard.period.title')}>{text(period.title)}</Row>
            {type === ApplicationType.ExcavationPermit && (
              <Row label={t('wizard.period.permitType')}>
                {enumLabel('PermitType', period.permitType)}
              </Row>
            )}
            <Row label={t('wizard.summary.period')}>
              {`${text(period.startDate)} – ${text(period.endDate)}`}
            </Row>
            {type !== ApplicationType.ExcavationPermit && (
              <Row label={t('wizard.period.usage')}>
                {enumLabel('Usage', period.usage)}
              </Row>
            )}
          </>,
        )}

        {section(
          'tasks',
          type === ApplicationType.ExcavationPermit
            ? draft.cableTasks.map((task, index) => (
                <Row
                  key={task.id}
                  label={t('wizard.tasks.taskTitle', { number: index + 1 })}
                >
                  {[
                    enumLabel('CableType', task.cableType),
                    ...task.workCategories.map((value) =>
                      enumLabel('WorkCategory', value),
                    ),
                  ].join(', ')}
                </Row>
              ))
            : draft.materials.map((material, index) => (
                <Row
                  key={material.id}
                  label={t('wizard.tasks.materialTitle', { number: index + 1 })}
                >
                  {`${enumLabel('MaterialType', material.type)} × ${text(material.amount)}`}
                </Row>
              )),
        )}

        {section(
          'otherActors',
          draft.actors.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              {t('wizard.actors.none')}
            </Typography>
          ) : (
            draft.actors.map((actor) => (
              <Row
                key={actor.id}
                label={enumLabel('ActorRole', actor.role)}
              >{`${text(actor.name)} · ${text(actor.phoneNumber)}`}</Row>
            ))
          ),
        )}

        {section(
          'contactInfo',
          draft.contactPersons.map((contact) => (
            <Row
              key={contact.id}
              label={text(contact.name)}
            >{`${enumLabel('Availability', contact.availability)} · ${text(contact.phoneNumber)} · ${text(contact.email)}`}</Row>
          )),
        )}

        {section(
          'areas',
          areas.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              {t('wizard.summary.noAreas')}
            </Typography>
          ) : (
            areas.map((area, index) => (
              <Row
                key={area.uuid}
                label={t('areas.cardTitle', {
                  number: index + 1,
                  road: area.roadName,
                })}
              >
                {[
                  t(roadOwnershipLabelKeys[area.roadOwnership]),
                  area.areaInSquareMeters
                    ? `${area.areaInSquareMeters} m²`
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Row>
            ))
          ),
        )}

        {section(
          'signPlanAndTraffic',
          <>
            <Row label={t('wizard.signPlan.signPlanTitle')}>
              {draft.signPlan.fileName ||
                enumLabel('SignPlanType', draft.signPlan.signPlanType)}
            </Row>
            <Row label={t('wizard.signPlan.trafficChanges')}>
              {draft.trafficChanges
                .map((value) => enumLabel('TrafficChange', value))
                .join(', ') || '–'}
            </Row>
            <Row label={t('wizard.signPlan.measuresTitle')}>
              {draft.trafficCalmingMeasures
                .map((measure) =>
                  enumLabel('TrafficCalmingMeasureType', measure.type),
                )
                .join(', ') || '–'}
            </Row>
          </>,
        )}

        {section(
          'documents',
          <Row label={t('wizard.summary.files')}>
            {draft.documents.map((document) => document.name).join(', ') || '–'}
          </Row>,
        )}
      </Box>

      {anyIncomplete && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          {t('wizard.summary.incomplete')}
        </Alert>
      )}
      {submitted && (
        <Alert severity="info" sx={{ mt: 3 }}>
          {t('wizard.summary.submitNotBuilt')}
        </Alert>
      )}

      <WizardFooter
        nextDisabled={anyIncomplete}
        nextLabel={t('wizard.summary.submit')}
        onBack={onBack}
        onNext={() => setSubmitted(true)}
      />
    </section>
  );
}

interface SummarySectionProps {
  title: string;
  incomplete: boolean;
  onEdit: () => void;
  children: ReactNode;
}

function SummarySection({
  title,
  incomplete,
  onEdit,
  children,
}: SummarySectionProps) {
  const { t } = useTranslation();
  return (
    <Paper
      component="section"
      sx={{ border: '1px solid #BDBDBD', p: 2 }}
      variant="outlined"
    >
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          gap: 1,
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Box sx={{ alignItems: 'baseline', columnGap: 1, display: 'flex' }}>
          <Typography component="h2" sx={{ fontWeight: 600 }} variant="body1">
            {title}
          </Typography>
          {incomplete && (
            <Typography sx={{ color: 'error.main' }} variant="body2">
              {t('areas.missingInfo')}
            </Typography>
          )}
        </Box>
        <Button
          aria-label={t('wizard.summary.editSection', { section: title })}
          onClick={onEdit}
          size="small"
          variant="outlined"
        >
          {t('areas.edit')}
        </Button>
      </Box>
      <Box component="dl" sx={{ display: 'grid', gap: 0.5, m: 0 }}>
        {children}
      </Box>
    </Paper>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 0, sm: 2 },
        gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
      }}
    >
      <Typography color="text.secondary" component="dt" variant="body2">
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0 }} variant="body2">
        {children}
      </Typography>
    </Box>
  );
}
