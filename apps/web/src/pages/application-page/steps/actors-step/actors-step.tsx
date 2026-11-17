import { Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  type ActorDraft,
  emptyActor,
} from '../../../../features/application-draft/application-draft.js';
import { validateActors } from '../../../../features/application-draft/draft-validation.js';
import { ActorRole } from '../../../../types/prisma-enums.js';
import {
  FieldRow,
  ItemCard,
  SelectInput,
  TextInput,
  useEnumOptions,
} from '../../components/form-fields.js';
import { StepShell } from '../../components/step-shell.js';
import { type DraftStepProps, patchItem } from '../step-props.js';

/** Other actors on the application (UC-040–042, UC-004 A2). */
export function ActorsStep({ draft, update, onBack, onNext }: DraftStepProps) {
  const { t } = useTranslation();
  const roleOptions = useEnumOptions('ActorRole', ActorRole);

  function set(id: string, patch: Partial<ActorDraft>) {
    update((current) => ({
      ...current,
      actors: patchItem(current.actors, id, patch),
    }));
  }

  return (
    <StepShell
      errors={validateActors(draft)}
      intro={t('wizard.actors.intro')}
      onBack={onBack}
      onNext={onNext}
      title={t('applicationWizard.steps.otherActors')}
    >
      {(errors) => (
        <>
          {draft.actors.length === 0 && (
            <Typography color="text.secondary">
              {t('wizard.actors.none')}
            </Typography>
          )}
          {draft.actors.map((actor, index) => {
            const path = `actors.${actor.id}`;
            const title =
              actor.name ||
              t('wizard.actors.actorTitle', {
                number: index + 1,
              });
            // Private actors have no CVR, department or contact (UC-040 A1).
            const isBusiness = actor.role !== '' && actor.role !== 'Private';
            return (
              <ItemCard
                deleteLabel={t('wizard.deleteItem', { item: title })}
                key={actor.id}
                onDelete={() =>
                  update((current) => ({
                    ...current,
                    actors: current.actors.filter(
                      (item) => item.id !== actor.id,
                    ),
                  }))
                }
                subtitle={
                  actor.role
                    ? t(`wizard.enums.ActorRole.${actor.role}`)
                    : undefined
                }
                title={title}
              >
                <FieldRow>
                  <SelectInput
                    errors={errors}
                    label={t('wizard.actors.role')}
                    onChange={(value) =>
                      set(actor.id, { role: value as ActorRole })
                    }
                    options={roleOptions}
                    path={`${path}.role`}
                    required
                    value={actor.role}
                  />
                  <TextInput
                    errors={errors}
                    label={t('wizard.actors.name')}
                    onChange={(value) => set(actor.id, { name: value })}
                    path={`${path}.name`}
                    required
                    value={actor.name}
                  />
                </FieldRow>
                <FieldRow>
                  <TextInput
                    errors={errors}
                    inputMode="tel"
                    label={t('wizard.phoneNumber')}
                    maxLength={8}
                    onChange={(value) => set(actor.id, { phoneNumber: value })}
                    path={`${path}.phoneNumber`}
                    required
                    type="tel"
                    value={actor.phoneNumber}
                  />
                  <TextInput
                    errors={errors}
                    label={t('wizard.email')}
                    onChange={(value) => set(actor.id, { email: value })}
                    path={`${path}.email`}
                    required
                    type="email"
                    value={actor.email}
                  />
                </FieldRow>
                {isBusiness && (
                  <FieldRow>
                    <TextInput
                      errors={errors}
                      inputMode="numeric"
                      label={t('wizard.actors.cvrNumber')}
                      maxLength={8}
                      onChange={(value) => set(actor.id, { cvrNumber: value })}
                      path={`${path}.cvrNumber`}
                      required
                      value={actor.cvrNumber}
                    />
                    <TextInput
                      errors={errors}
                      label={t('wizard.actors.department')}
                      onChange={(value) => set(actor.id, { department: value })}
                      path={`${path}.department`}
                      value={actor.department}
                    />
                    <TextInput
                      errors={errors}
                      label={t('wizard.actors.contactPersonName')}
                      onChange={(value) =>
                        set(actor.id, { contactPersonName: value })
                      }
                      path={`${path}.contactPersonName`}
                      value={actor.contactPersonName}
                    />
                  </FieldRow>
                )}
              </ItemCard>
            );
          })}
          <div>
            <Button
              onClick={() =>
                update((current) => ({
                  ...current,
                  actors: [...current.actors, emptyActor()],
                }))
              }
              variant="outlined"
            >
              {t('wizard.actors.add')}
            </Button>
          </div>
        </>
      )}
    </StepShell>
  );
}
