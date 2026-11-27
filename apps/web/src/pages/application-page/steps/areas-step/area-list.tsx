import { Box } from '@mui/material';
import type { Dispatch } from 'react';
import {
  type AreaEditAction,
  type AreaEditState,
  type AreaEntry,
  isRoadEditable,
} from '../../../../features/areas/area-edit-state.js';
import type { AreaFieldSet } from '../../../../features/areas/area-validation.js';
import type { ApplicationType } from '../../../../types/prisma-enums.js';
import { AreaCard } from './area-card.js';
import { areaErrorsFor, savedAreaErrorsFor } from './area-step-state.js';

interface AreaListProps {
  type: ApplicationType;
  state: AreaEditState;
  dispatch: Dispatch<AreaEditAction>;
  fieldSet: AreaFieldSet;
  canEdit: boolean;
  isSaving: boolean;
  /** Shown in the open area only. */
  saveError: string | null;
  onCancel: (entry: AreaEntry) => void;
  onDelete: (entry: AreaEntry) => void;
  onEdit: (entry: AreaEntry) => void;
  onSave: () => void;
}

/**
 * The areas as cards. Only the open area shows its form.
 * @param props - The edit state, used fields, save state and event handlers
 * @returns The rendered list of cards
 */
export function AreaList({
  type,
  state,
  dispatch,
  fieldSet,
  canEdit,
  isSaving,
  saveError,
  onCancel,
  onDelete,
  onEdit,
  onSave,
}: AreaListProps) {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {state.entries.map((entry, index) => {
        const isExpanded = entry.key === state.activeKey;
        const roadEditable = isRoadEditable(entry);
        return (
          <AreaCard
            areaKey={entry.key}
            canEditApplication={canEdit}
            details={entry.saved ?? null}
            draft={isExpanded ? state.draft : null}
            errors={isExpanded ? areaErrorsFor(type, state, entry) : {}}
            fieldSet={fieldSet}
            isExpanded={isExpanded}
            isMissingFields={
              Object.keys(savedAreaErrorsFor(type, entry)).length > 0
            }
            isSaving={isSaving}
            key={entry.key}
            number={index + 1}
            onCancel={() => onCancel(entry)}
            onChange={(field, value) =>
              dispatch({ type: 'change', field, value })
            }
            onDelete={() => onDelete(entry)}
            onEdit={() => onEdit(entry)}
            onSave={onSave}
            roadEditable={roadEditable}
            roadName={
              isExpanded && roadEditable
                ? (state.draft?.roadName ?? '')
                : (entry.saved?.roadName ?? '')
            }
            roadOwnership={entry.saved?.roadOwnership ?? ''}
            saveError={isExpanded ? saveError : null}
            showAllErrors={state.showErrors}
            source={entry.source}
          />
        );
      })}
    </Box>
  );
}
