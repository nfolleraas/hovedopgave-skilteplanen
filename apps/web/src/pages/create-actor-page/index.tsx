import { useParams } from 'react-router';
import { ActorForm } from '../actors-page/actor-form.js';
import { useActorsPage } from '../actors-page/actors-page.context.js';

// Temporary application context matching the development seed.
const demoCaseNumber = 'DEMO-2026-0001';

export default function CreateActorPage() {
  const { cancel, createActor } = useActorsPage();
  const { caseNumber } = useParams();

  return (
    <ActorForm
      onCancel={cancel}
      onSave={(actor) => createActor(caseNumber ?? demoCaseNumber, actor)}
    />
  );
}
