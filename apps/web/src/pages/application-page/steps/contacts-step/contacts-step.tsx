import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  type ContactPersonDraft,
  emptyContactPerson,
} from '../../../../features/application-draft/application-draft.js';
import { validateContactPersons } from '../../../../features/application-draft/draft-validation.js';
import { Availability } from '../../../../types/prisma-enums.js';
import {
  FieldRow,
  ItemCard,
  ListError,
  SelectInput,
  TextInput,
  useEnumOptions,
} from '../../components/form-fields.js';
import { StepShell } from '../../components/step-shell.js';
import { type DraftStepProps, patchItem } from '../step-props.js';

/** Contact persons on the application (UC-031–033). */
export function ContactsStep({
  draft,
  update,
  onBack,
  onNext,
}: DraftStepProps) {
  const { t } = useTranslation();
  const availabilityOptions = useEnumOptions('Availability', Availability);

  function set(id: string, patch: Partial<ContactPersonDraft>) {
    update((current) => ({
      ...current,
      contactPersons: patchItem(current.contactPersons, id, patch),
    }));
  }

  return (
    <StepShell
      errors={validateContactPersons(draft)}
      intro={t('wizard.contacts.intro')}
      onBack={onBack}
      onNext={onNext}
      title={t('applicationWizard.steps.contactInfo')}
    >
      {(errors) => (
        <>
          {draft.contactPersons.map((contact, index) => {
            const path = `contactPersons.${contact.id}`;
            const title =
              contact.name ||
              t('wizard.contacts.contactTitle', { number: index + 1 });
            return (
              <ItemCard
                deleteLabel={t('wizard.deleteItem', { item: title })}
                key={contact.id}
                // The last contact person cannot be deleted (UC-032 F1).
                onDelete={
                  draft.contactPersons.length > 1
                    ? () =>
                        update((current) => ({
                          ...current,
                          contactPersons: current.contactPersons.filter(
                            (item) => item.id !== contact.id,
                          ),
                        }))
                    : undefined
                }
                title={title}
              >
                <FieldRow>
                  <TextInput
                    errors={errors}
                    label={t('wizard.contacts.name')}
                    onChange={(value) => set(contact.id, { name: value })}
                    path={`${path}.name`}
                    required
                    value={contact.name}
                  />
                  <SelectInput
                    errors={errors}
                    label={t('wizard.contacts.availability')}
                    onChange={(value) =>
                      set(contact.id, { availability: value as Availability })
                    }
                    options={availabilityOptions}
                    path={`${path}.availability`}
                    required
                    value={contact.availability}
                  />
                </FieldRow>
                <FieldRow>
                  <TextInput
                    errors={errors}
                    inputMode="tel"
                    label={t('wizard.phoneNumber')}
                    maxLength={8}
                    onChange={(value) =>
                      set(contact.id, { phoneNumber: value })
                    }
                    path={`${path}.phoneNumber`}
                    required
                    type="tel"
                    value={contact.phoneNumber}
                  />
                  <TextInput
                    errors={errors}
                    label={t('wizard.email')}
                    onChange={(value) => set(contact.id, { email: value })}
                    path={`${path}.email`}
                    required
                    type="email"
                    value={contact.email}
                  />
                </FieldRow>
              </ItemCard>
            );
          })}
          <ListError error={errors.contactPersons} />
          <div>
            <Button
              onClick={() =>
                update((current) => ({
                  ...current,
                  contactPersons: [
                    ...current.contactPersons,
                    emptyContactPerson(),
                  ],
                }))
              }
              variant="outlined"
            >
              {t('wizard.contacts.add')}
            </Button>
          </div>
        </>
      )}
    </StepShell>
  );
}
