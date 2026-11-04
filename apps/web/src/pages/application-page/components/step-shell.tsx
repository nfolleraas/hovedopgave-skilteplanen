import { Alert, Box, Typography } from '@mui/material';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type DraftErrors,
  hasErrors,
} from '../../../features/application-draft/draft-validation.js';
import { fieldId } from './form-fields.js';
import { WizardFooter } from './wizard-footer.js';

interface StepShellProps {
  title: string;
  intro?: string;
  /** Errors for the step. Next is blocked while there are any. */
  errors?: DraftErrors;
  isLast?: boolean;
  onBack: () => void;
  onNext: () => void;
  /** Receives the errors to show, which stay hidden until Next is tried. */
  children: (shownErrors: DraftErrors) => ReactNode;
}

const noErrors: DraftErrors = {};

/** Title, error summary and Back/Next buttons shared by the wizard steps. */
export function StepShell({
  title,
  intro,
  errors = noErrors,
  isLast = false,
  onBack,
  onNext,
  children,
}: StepShellProps) {
  const { t } = useTranslation();
  const [showErrors, setShowErrors] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const blocked = showErrors && hasErrors(errors);

  useEffect(() => {
    if (blocked) summaryRef.current?.focus();
  }, [blocked]);

  function handleNext() {
    if (hasErrors(errors)) {
      setShowErrors(true);
      // Move focus to the first field with an error, if it is a field.
      const [first] = Object.keys(errors);
      const element = first && document.getElementById(fieldId(first));
      if (element) {
        element.focus();
      } else {
        summaryRef.current?.focus();
      }
      return;
    }
    onNext();
  }

  return (
    <section aria-labelledby="step-title">
      <Typography component="h1" id="step-title" sx={{ mb: 1 }} variant="h5">
        {title}
      </Typography>
      {intro && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {intro}
        </Typography>
      )}
      <Box sx={{ display: 'grid', gap: 2, mt: 2 }}>
        {children(showErrors ? errors : noErrors)}
      </Box>
      {blocked && (
        <Alert ref={summaryRef} severity="error" sx={{ mt: 3 }} tabIndex={-1}>
          {t('wizard.stepHasErrors', { count: Object.keys(errors).length })}
        </Alert>
      )}
      <WizardFooter nextDisabled={isLast} onBack={onBack} onNext={handleNext} />
    </section>
  );
}
