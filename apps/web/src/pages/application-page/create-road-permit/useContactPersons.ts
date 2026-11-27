import { useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApplicationContactPersons } from '../../../api/contact-persons.api.js';
import {
  contactPersonEditReducer,
  initialContactPersonEditState,
  isDirty,
} from '../../../features/contact-persons/contact-person-edit-state.js';
import { availabilityLabelKeys } from '../../../features/contact-persons/contact-person-labels.js';
import type { WizardApplication } from '../../../types/application.types.js';
import type { ContactPersonActor } from '../../../types/contact-person.types.js';

type ContactPersonsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      application: WizardApplication;
      actors: ContactPersonActor[];
    };

/**
 * Loads the draft's contact persons and actors once. The edit state lives in
 * the form, so an open contact person survives a change of step.
 */
export function useContactPersons(caseNumber: string) {
  const [state, dispatch] = useReducer(
    contactPersonEditReducer,
    initialContactPersonEditState,
  );
  const [load, setLoad] = useState<ContactPersonsLoad>({ status: 'loading' });

  useEffect(() => {
    if (load.status !== 'loading') return;

    let active = true;
    void getApplicationContactPersons(caseNumber).then(
      ({ application, actors, contactPersons }) => {
        if (!active) return;
        dispatch({ type: 'loaded', contactPersons });
        setLoad({ status: 'ready', application, actors });
      },
      () => {
        if (active) setLoad({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [caseNumber, load.status]);

  const { t } = useTranslation();
  const actors = load.status === 'ready' ? load.actors : [];
  // The saved contact persons, as the summary shows them.
  const rows = state.entries.flatMap(({ saved }) =>
    saved
      ? [
          {
            id: saved.uuid,
            name: saved.name,
            actorName:
              actors.find(({ uuid }) => uuid === saved.actorId)?.name ?? '',
            availability: t(availabilityLabelKeys[saved.availability]),
            phoneNumber: saved.phoneNumber,
            email: saved.email,
          },
        ]
      : [],
  );
  // The step is complete with a saved contact person and no open changes.
  const errors = [
    rows.length ? undefined : t('permit.errors.contactRequired'),
    isDirty(state) ? t('permit.errors.contactUnsaved') : undefined,
  ].filter((error) => error !== undefined);

  return {
    state,
    dispatch,
    load,
    rows,
    errors,
    retry: () => setLoad({ status: 'loading' }),
  };
}
