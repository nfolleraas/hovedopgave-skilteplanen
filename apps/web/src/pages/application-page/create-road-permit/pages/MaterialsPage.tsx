import {
  Alert,
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { type Ref, useRef, useState } from 'react';
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

/** Whether the editor's type and quantity can be saved. */
function checkMaterialDraft(
  draft: MaterialDraft,
  materialTypes: string[] | null | undefined,
) {
  const quantity = Number(draft.quantity);
  return {
    canSelectType: Boolean(materialTypes?.length),
    validType: materialTypes?.includes(draft.type) ?? false,
    validQuantity: Number.isSafeInteger(quantity) && quantity >= 1,
    quantity,
  };
}

/** Adds the draft as a new material, or replaces the one being edited. */
function upsertMaterial(
  materials: MaterialEntry[],
  draft: MaterialDraft,
  quantity: number,
): MaterialEntry[] {
  const entry: MaterialEntry = {
    id: draft.editingId ?? crypto.randomUUID(),
    type: draft.type,
    quantity,
    notes: draft.notes.trim(),
  };
  if (!draft.editingId) return [...materials, entry];
  return materials.map((material) =>
    material.id === draft.editingId ? entry : material,
  );
}

/** Explains that the material types could not be loaded, with a retry. */
function MaterialTypesError({
  materialTypes,
  onRetry,
}: {
  /** `undefined` while loading, `null` or empty when loading failed. */
  materialTypes: string[] | null | undefined;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (materialTypes === undefined || materialTypes?.length) return null;
  return (
    <Alert
      action={
        <Button onClick={onRetry} size="small">
          {t('permit.materials.retryTypes')}
        </Button>
      }
      severity="error"
    >
      {t('permit.materials.loadTypesError')}
    </Alert>
  );
}

type MaterialAnnouncement = {
  action: 'added' | 'updated' | 'removed';
  type: string;
};

/** The added materials with edit and remove buttons, or an empty state. */
function MaterialList({
  materials,
  materialLabels,
  unavailableMaterial,
  announcement,
  headingRef,
  onEdit,
  onRemove,
}: {
  materials: MaterialEntry[];
  materialLabels: Record<string, string>;
  unavailableMaterial?: { type: string; message: string };
  /** The last change, read aloud by screen readers. */
  announcement?: MaterialAnnouncement;
  headingRef: Ref<HTMLHeadingElement>;
  onEdit: (material: MaterialEntry) => void;
  onRemove: (material: MaterialEntry) => void;
}) {
  const { t } = useTranslation();
  let announcementText = '';
  if (announcement) {
    const material = materialLabels[announcement.type] ?? announcement.type;
    announcementText = {
      added: t('permit.materials.added', { material }),
      updated: t('permit.materials.updated', { material }),
      removed: t('permit.materials.removed', { material }),
    }[announcement.action];
  }

  return (
    <Box aria-labelledby="material-list-heading" component="section">
      <Typography
        component="h3"
        id="material-list-heading"
        ref={headingRef}
        tabIndex={-1}
        variant="h6"
      >
        {t('permit.materials.list')}
      </Typography>
      <Typography role="status" variant="body2">
        {announcementText}
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
          <Typography variant="body2">{t('permit.materials.empty')}</Typography>
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
                    onClick={() => onEdit(material)}
                    size="small"
                  >
                    {t('permit.actions.edit')}
                  </Button>
                  <Button
                    aria-label={t('permit.materials.removeItem', {
                      material: label,
                      number: index + 1,
                    })}
                    onClick={() => onRemove(material)}
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
  );
}

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
  const [announcement, setAnnouncement] = useState<MaterialAnnouncement>();
  const typeRef = useRef<{ focus: () => void }>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const materialLabels = getMaterialTypes(t);
  const { canSelectType, validType, validQuantity, quantity } =
    checkMaterialDraft(draft, materialTypes);
  const pendingDraft = hasMaterialDraft(draft);
  const showFieldErrors = submitted || (showErrors && pendingDraft);
  // Shown as field errors once the user has tried to save.
  const typeInvalid = canSelectType && showFieldErrors && !validType;
  const quantityInvalid = showFieldErrors && !validQuantity;

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

    onMaterialsChange(upsertMaterial(materials, draft, quantity));
    setAnnouncement({
      action: draft.editingId ? 'updated' : 'added',
      type: draft.type,
    });
    resetDraft();
  }

  /** Opens a material from the list in the editor. */
  function editMaterial(material: MaterialEntry) {
    onDraftChange({
      type: material.type,
      quantity: String(material.quantity),
      notes: material.notes,
      editingId: material.id,
    });
    setSubmitted(false);
    typeRef.current?.focus();
  }

  /** Removes a material and moves focus to the list heading. */
  function removeMaterial(material: MaterialEntry) {
    onMaterialsChange(materials.filter((entry) => entry.id !== material.id));
    if (draft.editingId === material.id) resetDraft();
    setAnnouncement({ action: 'removed', type: material.type });
    listHeadingRef.current?.focus();
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography color="text.secondary" variant="body2">
        {t('permit.materials.intro')}
      </Typography>
      <MaterialTypesError
        materialTypes={materialTypes}
        onRetry={onRetryMaterialTypes}
      />
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
            error={typeInvalid}
            fullWidth
            helperText={
              materialTypes === undefined
                ? t('permit.materials.loadingTypes')
                : typeInvalid && t('permit.errors.materialType')
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
            error={quantityInvalid}
            fullWidth
            helperText={
              quantityInvalid ? t('permit.errors.materialQuantity') : undefined
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

      <MaterialList
        announcement={announcement}
        headingRef={listHeadingRef}
        materialLabels={materialLabels}
        materials={materials}
        onEdit={editMaterial}
        onRemove={removeMaterial}
        unavailableMaterial={unavailableMaterial}
      />
    </Box>
  );
}
