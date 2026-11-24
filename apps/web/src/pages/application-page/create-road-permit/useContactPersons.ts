import { useEffect, useReducer, useState } from 'react';
import { getApplicationContactPersons } from '../../../api/contact-persons.api.js';
import {
  contactPersonEditReducer,
  initialContactPersonEditState,
} from '../../../features/contact-persons/contact-person-edit-state.js';
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

  return {
    state,
    dispatch,
    load,
    retry: () => setLoad({ status: 'loading' }),
  };
}
