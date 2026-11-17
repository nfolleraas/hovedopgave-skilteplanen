import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApplicationDraft } from '../../../../features/application-draft/application-draft.js';
import {
  hasErrors,
  validatePeriod,
  validateSignPlanAndTraffic,
  validateTasks,
} from '../../../../features/application-draft/draft-validation.js';
import {
  actorRoleLabelKeys,
  availabilityLabelKeys,
  formatPhoneNumber,
} from '../../../../features/contact-persons/contact-person-labels.js';
import type { WizardApplication } from '../../../../types/application.types.js';
import type {
  ContactPerson,
  ContactPersonActor,
} from '../../../../types/contact-person.types.js';
import { ApplicationType } from '../../../../types/prisma-enums.js';
import type { ApplicationStepId } from '../../application-steps.js';
import { WizardFooter } from '../../components/wizard-footer.js';

interface SummaryStepProps {
  application: WizardApplication;
  draft: ApplicationDraft;
  actors: ContactPersonActor[];
  contactPersons: ContactPerson[];
  onBack: () => void;
  onGoTo: (step: ApplicationStepId) => void;
}

/** Overview of the whole application before it is sent (UC-004 step 28). */
export function SummaryStep({
  application,
  draft,
  actors,
  contactPersons,
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
    // At least one contact person is required (UC-004 F7).
    contactInfo: contactPersons.length === 0,
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
              {t(`wizard.enums.ApplicationType.${type}`)}
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
          actors.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              {t('wizard.actors.none')}
            </Typography>
          ) : (
            actors.map((actor) => (
              <Row key={actor.uuid} label={t(actorRoleLabelKeys[actor.role])}>
                {actor.name}
              </Row>
            ))
          ),
        )}

        {section(
          'contactInfo',
          contactPersons.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
              {t('wizard.summary.noContacts')}
            </Typography>
          ) : (
            contactPersons.map((contact) => (
              <Row key={contact.uuid} label={contact.name}>
                {[
                  actors.find((actor) => actor.uuid === contact.actorId)?.name,
                  t(availabilityLabelKeys[contact.availability]),
                  formatPhoneNumber(contact.phoneNumber),
                  contact.email,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Row>
            ))
          ),
        )}

        {section(
          'areas',
          <Typography color="text.secondary" variant="body2">
            {t('wizard.summary.areasPlaceholder')}
          </Typography>,
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
              {t('wizard.summary.missingInfo')}
            </Typography>
          )}
        </Box>
        <Button
          aria-label={t('wizard.summary.editSection', { section: title })}
          onClick={onEdit}
          size="small"
          variant="outlined"
        >
          {t('wizard.summary.edit')}
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
