import {
  Alert,
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  emptyMaterialDraft,
  type MaterialDraft,
  type MaterialEntry,
} from '../formTypes';
import { PermitTable } from '../PermitTable';
import { getMaterialTypes } from '../permitOptions';
import { hasMaterialDraft } from '../validation';

type MaterialsPageProps = {
  materials: MaterialEntry[];
  draft: MaterialDraft;
  materialTypes: string[] | null | undefined;
  onMaterialsChange: (materials: MaterialEntry[]) => void;
  onDraftChange: (draft: MaterialDraft) => void;
  onRetryMaterialTypes: () => void;
  showErrors: boolean;
  unavailableMaterial?: { type: string; message: string };
};

/** Lets the user add, edit, and remove materials while retaining an unfinished draft. */
export function MaterialsPage({
  materials,
  draft,
  materialTypes,
  onMaterialsChange,
  onDraftChange,
  onRetryMaterialTypes,
  showErrors,
  unavailableMaterial,
}: MaterialsPageProps) {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [announcement, setAnnouncement] = useState<{
    action: 'added' | 'updated' | 'removed';
    type: string;
  }>();
  const typeRef = useRef<{ focus: () => void }>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const materialLabels = getMaterialTypes(t);
  const canSelectType = Boolean(materialTypes?.length);
  const pendingDraft = hasMaterialDraft(draft);
  const showFieldErrors = submitted || (showErrors && pendingDraft);
  const quantity = Number(draft.quantity);
  const validType = materialTypes?.includes(draft.type) ?? false;
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1;
  const announcedMaterial =
    announcement && (materialLabels[announcement.type] ?? announcement.type);

  /** Clears the material editor and its submitted validation state. */
  function resetDraft() {
    onDraftChange({ ...emptyMaterialDraft });
    setSubmitted(false);
  }

  /** Validates the draft and adds or replaces the material before clearing the editor. */
  function saveMaterial() {
    if (!canSelectType) return;
    setSubmitted(true);
    if (!validType) {
      typeRef.current?.focus();
      return;
    }
    if (!validQuantity) {
      quantityRef.current?.focus();
      return;
    }

    const entry: MaterialEntry = {
      id: draft.editingId ?? crypto.randomUUID(),
      type: draft.type,
      quantity,
      notes: draft.notes.trim(),
    };

    onMaterialsChange(
      draft.editingId
        ? materials.map((material) =>
            material.id === draft.editingId ? entry : material,
          )
        : [...materials, entry],
    );
    setAnnouncement({
      action: draft.editingId ? 'updated' : 'added',
      type: draft.type,
    });
    resetDraft();
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography color="text.secondary" variant="body2">
        {t('permit.materials.intro')}
      </Typography>
      {materialTypes !== undefined && !canSelectType && (
        <Alert
          action={
            <Button onClick={onRetryMaterialTypes} size="small">
              {t('permit.materials.retryTypes')}
            </Button>
          }
          severity="error"
        >
          {t('permit.materials.loadTypesError')}
        </Alert>
      )}
      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          saveMaterial();
        }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'minmax(0, 1fr) 116px',
            },
            gap: 2,
          }}
        >
          <TextField
            disabled={!canSelectType}
            error={canSelectType && showFieldErrors && !validType}
            fullWidth
            helperText={
              materialTypes === undefined
                ? t('permit.materials.loadingTypes')
                : canSelectType && showFieldErrors && !validType
                  ? t('permit.errors.materialType')
                  : undefined
            }
            id="material-type"
            inputRef={typeRef}
            label={t('permit.materials.type')}
            name="materialType"
            onChange={(event) =>
              onDraftChange({ ...draft, type: event.target.value })
            }
            required
            select
            slotProps={{
              select: {
                MenuProps: {
                  slotProps: {
                    paper: {
                      sx: {
                        maxHeight: 'min(496px, calc(100dvh - 64px))',
                        overflowY: 'auto',
                        '& .MuiMenuItem-root': { minHeight: 48 },
                      },
                    },
                  },
                },
              },
            }}
            value={validType ? draft.type : ''}
          >
            <MenuItem disabled sx={{ display: 'none' }} value="">
              {t('permit.materials.choose')}
            </MenuItem>
            {materialTypes?.map((type) => (
              <MenuItem key={type} value={type}>
                {materialLabels[type] ?? type}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            error={showFieldErrors && !validQuantity}
            fullWidth
            helperText={
              showFieldErrors && !validQuantity
                ? t('permit.errors.materialQuantity')
                : undefined
            }
            id="material-quantity"
            inputRef={quantityRef}
            label={t('permit.materials.quantity')}
            name="materialQuantity"
            onChange={(event) =>
              onDraftChange({ ...draft, quantity: event.target.value })
            }
            required
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
            type="number"
            value={draft.quantity}
          />
        </Box>
        <TextField
          fullWidth
          id="material-notes"
          label={t('permit.materials.notes')}
          minRows={2}
          multiline
          name="materialNotes"
          onChange={(event) =>
            onDraftChange({ ...draft, notes: event.target.value })
          }
          value={draft.notes}
        />
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            justifyContent: 'end',
          }}
        >
          <Button
            disabled={!canSelectType}
            sx={{ minHeight: 44 }}
            type="submit"
            variant="contained"
          >
            {draft.editingId
              ? t('permit.materials.save')
              : t('permit.materials.add')}
          </Button>
          {(pendingDraft || submitted) && (
            <Button
              onClick={() => {
                resetDraft();
                typeRef.current?.focus();
              }}
              sx={{ minHeight: 44 }}
              variant="outlined"
            >
              {t('permit.actions.cancel')}
            </Button>
          )}
        </Box>
      </Box>

      <Box aria-labelledby="material-list-heading" component="section">
        <Typography
          component="h3"
          id="material-list-heading"
          ref={listHeadingRef}
          tabIndex={-1}
          variant="h6"
        >
          {t('permit.materials.list')}
        </Typography>
        <Typography role="status" variant="body2">
          {announcement?.action === 'added' &&
            t('permit.materials.added', { material: announcedMaterial })}
          {announcement?.action === 'updated' &&
            t('permit.materials.updated', { material: announcedMaterial })}
          {announcement?.action === 'removed' &&
            t('permit.materials.removed', { material: announcedMaterial })}
        </Typography>
        {materials.length === 0 ? (
          <Box
            sx={{
              p: 3,
              mt: 2,
              bgcolor: '#F7F9FC',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2">
              {t('permit.materials.empty')}
            </Typography>
          </Box>
        ) : (
          <PermitTable
            columns={[
              { label: t('permit.materials.type') },
              { label: t('permit.materials.quantity'), align: 'right' },
              { label: t('permit.materials.notes') },
              { label: t('permit.materials.actions'), align: 'right' },
            ]}
            label={t('permit.materials.list')}
            outlined
            rows={materials.map((material, index) => {
              const label = materialLabels[material.type] ?? material.type;
              return {
                id: material.id,
                cells: [
                  unavailableMaterial?.type === material.type ? (
                    <Box key="type">
                      {label}
                      <Typography color="error.dark" variant="body2">
                        {unavailableMaterial.message}
                      </Typography>
                    </Box>
                  ) : (
                    label
                  ),
                  material.quantity,
                  <Box key="notes" sx={{ whiteSpace: 'pre-wrap' }}>
                    {material.notes || '—'}
                  </Box>,
                  <Box
                    key="actions"
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: { xs: 'start', md: 'end' },
                    }}
                  >
                    <Button
                      aria-label={t('permit.materials.editItem', {
                        material: label,
                        number: index + 1,
                      })}
                      onClick={() => {
                        onDraftChange({
                          type: material.type,
                          quantity: String(material.quantity),
                          notes: material.notes,
                          editingId: material.id,
                        });
                        setSubmitted(false);
                        typeRef.current?.focus();
                      }}
                      size="small"
                    >
                      {t('permit.actions.edit')}
                    </Button>
                    <Button
                      aria-label={t('permit.materials.removeItem', {
                        material: label,
                        number: index + 1,
                      })}
                      onClick={() => {
                        onMaterialsChange(
                          materials.filter((entry) => entry.id !== material.id),
                        );
                        if (draft.editingId === material.id) resetDraft();
                        setAnnouncement({
                          action: 'removed',
                          type: material.type,
                        });
                        listHeadingRef.current?.focus();
                      }}
                      size="small"
                      sx={{ color: 'error.dark' }}
                    >
                      {t('permit.actions.remove')}
                    </Button>
                  </Box>,
                ],
              };
            })}
          />
        )}
      </Box>
    </Box>
  );
}
