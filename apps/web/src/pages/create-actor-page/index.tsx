import type { ReactElement } from 'react';
import { useParams } from 'react-router';
import { ActorForm } from '../actors-page/actor-form.js';
import { useActorsPage } from '../actors-page/actors-page.context.js';

// Application selection is a placeholder until its feature branch is merged.
// Keep this case number aligned with the application development seeder.
const placeholderCaseNumber = 'DEMO-2026-0001';

export default function CreateActorPage(): ReactElement {
  const { cancel, createActor } = useActorsPage();
  const { caseNumber } = useParams();

  return (
    <ActorForm
      onCancel={cancel}
      onSave={(actor) =>
        createActor(caseNumber ?? placeholderCaseNumber, actor)
      }
    />
  );
}
