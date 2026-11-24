import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useState } from 'react';
import type { SavedActor } from '../../../actors-page/actor.types.js';
import { ActorForm } from '../../../actors-page/actor-form.js';
import type { ActorsPageContext } from '../../../actors-page/actors-page.context.js';
import ActorsPage from '../../../actors-page/index.js';

/** Keeps actor creation and editing inside the application's fourth step. */
export function ActorsSection({
  caseNumber,
  context,
}: {
  caseNumber: string;
  context: ActorsPageContext;
}) {
  const [editor, setEditor] = useState<SavedActor | 'create' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <>
      <ActorsPage
        context={context}
        onCreate={() => setEditor('create')}
        onEdit={setEditor}
      />
      <Dialog
        aria-labelledby="application-actor-editor-title"
        fullWidth
        maxWidth="md"
        onClose={() => {
          if (!isSaving) setEditor(null);
        }}
        open={editor !== null}
      >
        <DialogTitle id="application-actor-editor-title">
          {editor === 'create' ? 'Opret aktør' : 'Opdater aktør'}
        </DialogTitle>
        <DialogContent>
          {editor && (
            <ActorForm
              initialActor={editor === 'create' ? undefined : editor}
              key={editor === 'create' ? 'create' : editor.uuid}
              onCancel={() => setEditor(null)}
              onSave={async (values) => {
                setIsSaving(true);
                try {
                  if (editor === 'create') {
                    await context.createActor(caseNumber, values);
                  } else {
                    await context.updateActor(editor.uuid, values);
                  }
                  setEditor(null);
                } finally {
                  setIsSaving(false);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
