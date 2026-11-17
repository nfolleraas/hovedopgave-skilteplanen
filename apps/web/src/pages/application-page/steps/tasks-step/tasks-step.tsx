import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  type CableTaskDraft,
  emptyCableTask,
  emptyMaterial,
  type MaterialDraft,
} from '../../../../features/application-draft/application-draft.js';
import { validateTasks } from '../../../../features/application-draft/draft-validation.js';
import {
  ApplicationType,
  CableSubtype,
  CableType,
  ExecutionMethod,
  MaterialType,
  WorkCategory,
} from '../../../../types/prisma-enums.js';
import {
  FieldRow,
  ItemCard,
  ListError,
  MultiSelectInput,
  SelectInput,
  TextInput,
  useEnumOptions,
} from '../../components/form-fields.js';
import { StepShell } from '../../components/step-shell.js';
import { type DraftStepProps, patchItem } from '../step-props.js';

/**
 * Cable tasks for excavation permits (UC-028–030) and materials for road
 * use permits (UC-006 steps 12–14, UC-007 steps 8–11).
 */
export function TasksStep(props: DraftStepProps) {
  const { t } = useTranslation();
  const { application, draft, onBack, onNext } = props;
  const isExcavation = application.type === ApplicationType.ExcavationPermit;

  return (
    <StepShell
      errors={validateTasks(application.type, draft)}
      intro={
        isExcavation
          ? t('wizard.tasks.introTasks')
          : t('wizard.tasks.introMaterials')
      }
      onBack={onBack}
      onNext={onNext}
      title={t('applicationWizard.steps.tasks')}
    >
      {(errors) =>
        isExcavation ? (
          <CableTaskList {...props} errors={errors} />
        ) : (
          <MaterialList {...props} errors={errors} />
        )
      }
    </StepShell>
  );
}

type ListProps = DraftStepProps & {
  errors: ReturnType<typeof validateTasks>;
};

function CableTaskList({ draft, update, errors }: ListProps) {
  const { t } = useTranslation();
  const cableTypeOptions = useEnumOptions('CableType', CableType);
  const subtypeOptions = useEnumOptions('CableSubtype', CableSubtype);
  const workOptions = useEnumOptions('WorkCategory', WorkCategory);
  const methodOptions = useEnumOptions('ExecutionMethod', ExecutionMethod);

  function set(id: string, patch: Partial<CableTaskDraft>) {
    update((current) => ({
      ...current,
      cableTasks: patchItem(current.cableTasks, id, patch),
    }));
  }

  return (
    <>
      {draft.cableTasks.map((task, index) => {
        const path = `cableTasks.${task.id}`;
        const title = t('wizard.tasks.taskTitle', { number: index + 1 });
        return (
          <ItemCard
            deleteLabel={t('wizard.deleteItem', { item: title })}
            key={task.id}
            // The last task cannot be deleted (UC-029 F1).
            onDelete={
              draft.cableTasks.length > 1
                ? () =>
                    update((current) => ({
                      ...current,
                      cableTasks: current.cableTasks.filter(
                        (item) => item.id !== task.id,
                      ),
                    }))
                : undefined
            }
            title={title}
          >
            <FieldRow>
              <SelectInput
                errors={errors}
                label={t('wizard.tasks.cableType')}
                onChange={(value) =>
                  set(task.id, { cableType: value as CableType })
                }
                options={cableTypeOptions}
                path={`${path}.cableType`}
                required
                value={task.cableType}
              />
              <MultiSelectInput
                errors={errors}
                label={t('wizard.tasks.cableSubtypes')}
                onChange={(value) => set(task.id, { cableSubtypes: value })}
                options={subtypeOptions}
                path={`${path}.cableSubtypes`}
                required
                value={task.cableSubtypes}
              />
            </FieldRow>
            <OtherDescriptions
              errors={errors}
              fields={[
                {
                  show: task.cableType === CableType.Other,
                  key: 'cableTypesDescription',
                  label: t('wizard.tasks.cableTypesDescription'),
                },
                {
                  show: task.cableSubtypes.includes(CableSubtype.Other),
                  key: 'cableSubtypesDescription',
                  label: t('wizard.tasks.cableSubtypesDescription'),
                },
              ]}
              onChange={(key, value) => set(task.id, { [key]: value })}
              path={path}
              task={task}
            />
            <FieldRow>
              <MultiSelectInput
                errors={errors}
                label={t('wizard.tasks.workCategories')}
                onChange={(value) => set(task.id, { workCategories: value })}
                options={workOptions}
                path={`${path}.workCategories`}
                required
                value={task.workCategories}
              />
              <MultiSelectInput
                errors={errors}
                label={t('wizard.tasks.executionMethods')}
                onChange={(value) => set(task.id, { executionMethods: value })}
                options={methodOptions}
                path={`${path}.executionMethods`}
                required
                value={task.executionMethods}
              />
            </FieldRow>
            <OtherDescriptions
              errors={errors}
              fields={[
                {
                  show: task.workCategories.includes(WorkCategory.Other),
                  key: 'workCategoriesDescription',
                  label: t('wizard.tasks.workCategoriesDescription'),
                },
                {
                  show: task.executionMethods.includes(ExecutionMethod.Other),
                  key: 'executionMethodsDescription',
                  label: t('wizard.tasks.executionMethodsDescription'),
                },
              ]}
              onChange={(key, value) => set(task.id, { [key]: value })}
              path={path}
              task={task}
            />
          </ItemCard>
        );
      })}
      <ListError error={errors.cableTasks} />
      <div>
        <Button
          onClick={() =>
            update((current) => ({
              ...current,
              cableTasks: [...current.cableTasks, emptyCableTask()],
            }))
          }
          variant="outlined"
        >
          {t('wizard.tasks.addTask')}
        </Button>
      </div>
    </>
  );
}

type DescriptionKey =
  | 'cableTypesDescription'
  | 'cableSubtypesDescription'
  | 'workCategoriesDescription'
  | 'executionMethodsDescription';

interface OtherDescriptionsProps {
  task: CableTaskDraft;
  path: string;
  errors: ListProps['errors'];
  fields: { show: boolean; key: DescriptionKey; label: string }[];
  onChange: (key: DescriptionKey, value: string) => void;
}

/** Remark fields shown when "Andet" is chosen (UC-028 A1–A2). */
function OtherDescriptions({
  task,
  path,
  errors,
  fields,
  onChange,
}: OtherDescriptionsProps) {
  const shown = fields.filter((field) => field.show);
  if (shown.length === 0) return null;
  return (
    <FieldRow>
      {shown.map((field) => (
        <TextInput
          errors={errors}
          key={field.key}
          label={field.label}
          onChange={(value) => onChange(field.key, value)}
          path={`${path}.${field.key}`}
          required
          value={task[field.key]}
        />
      ))}
    </FieldRow>
  );
}

function MaterialList({ draft, update, errors }: ListProps) {
  const { t } = useTranslation();
  const typeOptions = useEnumOptions('MaterialType', MaterialType);

  function set(id: string, patch: Partial<MaterialDraft>) {
    update((current) => ({
      ...current,
      materials: patchItem(current.materials, id, patch),
    }));
  }

  return (
    <>
      {draft.materials.map((material, index) => {
        const path = `materials.${material.id}`;
        const title = t('wizard.tasks.materialTitle', { number: index + 1 });
        return (
          <ItemCard
            deleteLabel={t('wizard.deleteItem', { item: title })}
            key={material.id}
            onDelete={
              draft.materials.length > 1
                ? () =>
                    update((current) => ({
                      ...current,
                      materials: current.materials.filter(
                        (item) => item.id !== material.id,
                      ),
                    }))
                : undefined
            }
            title={title}
          >
            <FieldRow>
              <SelectInput
                errors={errors}
                label={t('wizard.tasks.materialType')}
                onChange={(value) =>
                  set(material.id, { type: value as MaterialType })
                }
                options={typeOptions}
                path={`${path}.type`}
                required
                value={material.type}
              />
              <TextInput
                errors={errors}
                inputMode="numeric"
                label={t('wizard.tasks.amount')}
                onChange={(value) => set(material.id, { amount: value })}
                path={`${path}.amount`}
                required
                value={material.amount}
              />
            </FieldRow>
            <TextInput
              errors={errors}
              label={t('wizard.tasks.materialDescription')}
              multiline
              onChange={(value) => set(material.id, { description: value })}
              path={`${path}.description`}
              value={material.description}
            />
          </ItemCard>
        );
      })}
      <ListError error={errors.materials} />
      <div>
        <Button
          onClick={() =>
            update((current) => ({
              ...current,
              materials: [...current.materials, emptyMaterial()],
            }))
          }
          variant="outlined"
        >
          {t('wizard.tasks.addMaterial')}
        </Button>
      </div>
    </>
  );
}
