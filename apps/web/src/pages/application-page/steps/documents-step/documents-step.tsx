import { Alert, Box, Button, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { newId } from '../../../../features/application-draft/application-draft.js';
import { isAllowedDocument } from '../../../../features/application-draft/draft-validation.js';
import { ItemCard } from '../../components/form-fields.js';
import { StepShell } from '../../components/step-shell.js';
import type { DraftStepProps } from '../step-props.js';

/**
 * Other documents (UC-019, UC-020). Only the file names are kept until
 * upload to S3 is built.
 */
export function DocumentsStep({
  draft,
  update,
  onBack,
  onNext,
}: DraftStepProps) {
  const { t, i18n } = useTranslation();
  const [rejected, setRejected] = useState<string[]>([]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const list = Array.from(files);
    const allowed = list.filter((file) => isAllowedDocument(file.name));
    setRejected(
      list
        .filter((file) => !isAllowedDocument(file.name))
        .map((file) => file.name),
    );
    const today = new Date().toISOString().slice(0, 10);
    update((current) => ({
      ...current,
      documents: [
        ...current.documents,
        ...allowed.map((file) => ({
          id: newId(),
          name: file.name,
          date: today,
        })),
      ],
    }));
  }

  return (
    <StepShell
      intro={t('wizard.documents.intro')}
      onBack={onBack}
      onNext={onNext}
      title={t('applicationWizard.steps.documents')}
    >
      {() => (
        <>
          <Box
            onDragOver={(event) => event.preventDefault()}
            // UC-019 A1: files can be dragged into the page.
            onDrop={(event) => {
              event.preventDefault();
              addFiles(event.dataTransfer.files);
            }}
            sx={{
              alignItems: 'center',
              backgroundColor: '#F7F9FC',
              border: '2px dashed #757575',
              borderRadius: 1,
              display: 'grid',
              gap: 1,
              justifyItems: 'center',
              p: 3,
            }}
          >
            <Typography color="text.secondary">
              {t('wizard.documents.dropHint')}
            </Typography>
            <Button component="label" variant="outlined">
              {t('wizard.documents.choose')}
              <input
                accept="image/png,image/jpeg"
                hidden
                multiple
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = '';
                }}
                type="file"
              />
            </Button>
          </Box>

          {rejected.length > 0 && (
            <Alert onClose={() => setRejected([])} severity="error">
              {t('wizard.documents.wrongType', { files: rejected.join(', ') })}
            </Alert>
          )}

          {draft.documents.length === 0 ? (
            <Typography color="text.secondary">
              {t('wizard.documents.none')}
            </Typography>
          ) : (
            draft.documents.map((document) => (
              <ItemCard
                deleteLabel={t('wizard.deleteItem', { item: document.name })}
                key={document.id}
                onDelete={() =>
                  update((current) => ({
                    ...current,
                    documents: current.documents.filter(
                      (item) => item.id !== document.id,
                    ),
                  }))
                }
                subtitle={new Date(document.date).toLocaleDateString(
                  i18n.language,
                )}
                title={document.name}
              >
                <Typography color="text.secondary" variant="body2">
                  {t('wizard.documents.notUploaded')}
                </Typography>
              </ItemCard>
            ))
          )}
        </>
      )}
    </StepShell>
  );
}
