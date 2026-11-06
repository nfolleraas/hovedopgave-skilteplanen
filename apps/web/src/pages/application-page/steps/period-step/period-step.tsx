import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  dummyMunicipalities,
  type PeriodDraft,
} from '../../../../features/application-draft/application-draft.js';
import { validatePeriod } from '../../../../features/application-draft/draft-validation.js';
import {
  ApplicationType,
  PermitType,
  Usage,
} from '../../../../types/prisma-enums.js';
import {
  FieldRow,
  SelectInput,
  TextInput,
  useEnumOptions,
} from '../../components/form-fields.js';
import { StepShell } from '../../components/step-shell.js';
import type { DraftStepProps } from '../step-props.js';

/** Municipality, title and period (UC-004 steps 2–8, UC-007 steps 3–14). */
export function PeriodStep({
  application,
  draft,
  update,
  onBack,
  onNext,
}: DraftStepProps) {
  const { t } = useTranslation();
  const { period } = draft;
  const { type } = application;
  const isExcavation = type === ApplicationType.ExcavationPermit;
  const permitTypeOptions = useEnumOptions('PermitType', PermitType);
  const usageOptions = useEnumOptions('Usage', Usage);
  const municipalityOptions = dummyMunicipalities.map((name) => ({
    value: name,
    label: name,
  }));

  function set<K extends keyof PeriodDraft>(field: K, value: PeriodDraft[K]) {
    update((current) => ({
      ...current,
      period: { ...current.period, [field]: value },
    }));
  }

  return (
    <StepShell
      errors={validatePeriod(type, period)}
      intro={t(`wizard.period.intro.${type}`)}
      onBack={onBack}
      onNext={onNext}
      title={t('applicationWizard.steps.municipalityAndPeriod')}
    >
      {(errors) => (
        <>
          <FieldRow>
            <SelectInput
              errors={errors}
              label={t('wizard.period.municipality')}
              onChange={(value) => set('municipality', value)}
              options={municipalityOptions}
              path="period.municipality"
              required
              value={period.municipality}
            />
            <TextInput
              errors={errors}
              label={t('wizard.period.title')}
              onChange={(value) => set('title', value)}
              path="period.title"
              required={!isExcavation}
              value={period.title}
            />
          </FieldRow>

          {isExcavation && (
            <>
              <FieldRow>
                <SelectInput
                  errors={errors}
                  label={t('wizard.period.permitType')}
                  onChange={(value) => set('permitType', value as PermitType)}
                  options={permitTypeOptions}
                  path="period.permitType"
                  required
                  value={period.permitType}
                />
                <span />
              </FieldRow>
              {/* UC-004 A1: a notice can get extra terms. */}
              {period.permitType === PermitType.Notice && (
                <Alert severity="info">{t('wizard.period.noticeInfo')}</Alert>
              )}
            </>
          )}

          <FieldRow>
            <TextInput
              errors={errors}
              label={t('wizard.period.startDate')}
              onChange={(value) => set('startDate', value)}
              path="period.startDate"
              required
              type="date"
              value={period.startDate}
            />
            <TextInput
              errors={errors}
              label={t('wizard.period.endDate')}
              onChange={(value) => set('endDate', value)}
              path="period.endDate"
              required
              type="date"
              value={period.endDate}
            />
          </FieldRow>

          {!isExcavation && (
            <FieldRow>
              <SelectInput
                errors={errors}
                label={t('wizard.period.usage')}
                onChange={(value) => set('usage', value as Usage)}
                options={usageOptions}
                path="period.usage"
                required
                value={period.usage}
              />
              {period.usage === Usage.Other ? (
                <TextInput
                  errors={errors}
                  label={t('wizard.period.usageDescription')}
                  onChange={(value) => set('usageDescription', value)}
                  path="period.usageDescription"
                  required
                  value={period.usageDescription}
                />
              ) : (
                <span />
              )}
            </FieldRow>
          )}
        </>
      )}
    </StepShell>
  );
}
