import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  emptyTrafficCalmingMeasure,
  type SignPlanDraft,
  type TrafficCalmingMeasureDraft,
} from '../../../../features/application-draft/application-draft.js';
import { validateSignPlanAndTraffic } from '../../../../features/application-draft/draft-validation.js';
import {
  SignPlanType,
  TrafficCalmingMeasureScope,
  TrafficCalmingMeasureType,
  TrafficChange,
} from '../../../../types/prisma-enums.js';
import {
  FieldRow,
  ItemCard,
  ListError,
  MultiSelectInput,
  SelectInput,
  TextInput,
  useEnumOptions,
} from '../../components/form-fields.js';
import { StepShell } from '../../components/step-shell.js';
import { type DraftStepProps, patchItem } from '../step-props.js';

/** Sign plan, traffic changes and measures (UC-004 steps 22–24). */
export function SignPlanStep({
  draft,
  update,
  onBack,
  onNext,
}: DraftStepProps) {
  const { t } = useTranslation();
  const signPlanTypeOptions = useEnumOptions('SignPlanType', SignPlanType);
  const trafficChangeOptions = useEnumOptions('TrafficChange', TrafficChange);
  const measureTypeOptions = useEnumOptions(
    'TrafficCalmingMeasureType',
    TrafficCalmingMeasureType,
  );
  const scopeOptions = useEnumOptions(
    'TrafficCalmingMeasureScope',
    TrafficCalmingMeasureScope,
  );

  function setSignPlan(patch: Partial<SignPlanDraft>) {
    update((current) => ({
      ...current,
      signPlan: { ...current.signPlan, ...patch },
    }));
  }

  function setMeasure(id: string, patch: Partial<TrafficCalmingMeasureDraft>) {
    update((current) => ({
      ...current,
      trafficCalmingMeasures: patchItem(
        current.trafficCalmingMeasures,
        id,
        patch,
      ),
    }));
  }

  return (
    <StepShell
      errors={validateSignPlanAndTraffic(draft)}
      onBack={onBack}
      onNext={onNext}
      title={t('applicationWizard.steps.signPlanAndTraffic')}
    >
      {(errors) => (
        <>
          <ItemCard title={t('wizard.signPlan.signPlanTitle')}>
            <Typography color="text.secondary" variant="body2">
              {t('wizard.signPlan.signPlanIntro')}
            </Typography>
            <FieldRow>
              <SelectInput
                errors={errors}
                label={t('wizard.signPlan.signPlanType')}
                onChange={(value) =>
                  setSignPlan({ signPlanType: value as SignPlanType })
                }
                options={signPlanTypeOptions}
                path="signPlan.signPlanType"
                value={draft.signPlan.signPlanType}
              />
              <TextInput
                errors={errors}
                label={t('wizard.signPlan.group')}
                onChange={(value) => setSignPlan({ group: value })}
                path="signPlan.group"
                value={draft.signPlan.group}
              />
              <TextInput
                errors={errors}
                label={t('wizard.signPlan.plan')}
                onChange={(value) => setSignPlan({ plan: value })}
                path="signPlan.plan"
                value={draft.signPlan.plan}
              />
            </FieldRow>
            <Box sx={{ alignItems: 'center', display: 'flex', gap: 2 }}>
              <Button component="label" variant="outlined">
                {t('wizard.signPlan.uploadSignPlan')}
                <input
                  accept="image/png,image/jpeg"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setSignPlan({ fileName: file.name });
                    event.target.value = '';
                  }}
                  type="file"
                />
              </Button>
              <Typography color="text.secondary" variant="body2">
                {draft.signPlan.fileName || t('wizard.signPlan.noFile')}
              </Typography>
            </Box>
          </ItemCard>

          <ItemCard title={t('wizard.signPlan.trafficTitle')}>
            <MultiSelectInput
              errors={errors}
              label={t('wizard.signPlan.trafficChanges')}
              onChange={(value) =>
                update((current) => ({ ...current, trafficChanges: value }))
              }
              options={trafficChangeOptions}
              path="trafficChanges"
              value={draft.trafficChanges}
            />
          </ItemCard>

          <Typography component="h2" sx={{ fontWeight: 600, mt: 1 }}>
            {t('wizard.signPlan.measuresTitle')}
          </Typography>
          {draft.trafficCalmingMeasures.map((measure, index) => {
            const path = `trafficCalmingMeasures.${measure.id}`;
            const title = t('wizard.signPlan.measureTitle', {
              number: index + 1,
            });
            return (
              <ItemCard
                deleteLabel={t('wizard.deleteItem', { item: title })}
                key={measure.id}
                onDelete={() =>
                  update((current) => ({
                    ...current,
                    trafficCalmingMeasures:
                      current.trafficCalmingMeasures.filter(
                        (item) => item.id !== measure.id,
                      ),
                  }))
                }
                title={title}
              >
                <FieldRow>
                  <SelectInput
                    errors={errors}
                    label={t('wizard.signPlan.measureType')}
                    onChange={(value) =>
                      setMeasure(measure.id, {
                        type: value as TrafficCalmingMeasureType,
                      })
                    }
                    options={measureTypeOptions}
                    path={`${path}.type`}
                    required
                    value={measure.type}
                  />
                  <SelectInput
                    errors={errors}
                    label={t('wizard.signPlan.scope')}
                    onChange={(value) =>
                      setMeasure(measure.id, {
                        scope: value as TrafficCalmingMeasureScope,
                      })
                    }
                    options={scopeOptions}
                    path={`${path}.scope`}
                    required
                    value={measure.scope}
                  />
                  <TextInput
                    errors={errors}
                    label={t('wizard.signPlan.protectionLevel')}
                    onChange={(value) =>
                      setMeasure(measure.id, { protectionLevel: value })
                    }
                    path={`${path}.protectionLevel`}
                    value={measure.protectionLevel}
                  />
                </FieldRow>
                <TextInput
                  errors={errors}
                  label={t('wizard.signPlan.measureDescription')}
                  multiline
                  onChange={(value) =>
                    setMeasure(measure.id, { description: value })
                  }
                  path={`${path}.description`}
                  value={measure.description}
                />
              </ItemCard>
            );
          })}
          <ListError error={errors.trafficCalmingMeasures} />
          <div>
            <Button
              onClick={() =>
                update((current) => ({
                  ...current,
                  trafficCalmingMeasures: [
                    ...current.trafficCalmingMeasures,
                    emptyTrafficCalmingMeasure(),
                  ],
                }))
              }
              variant="outlined"
            >
              {t('wizard.signPlan.addMeasure')}
            </Button>
          </div>
        </>
      )}
    </StepShell>
  );
}
