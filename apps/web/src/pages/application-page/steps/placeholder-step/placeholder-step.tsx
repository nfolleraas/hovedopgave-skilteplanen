import { Alert } from '@mui/material';
import { StepShell } from '../../components/step-shell.js';

interface PlaceholderStepProps {
  title: string;
  message: string;
  onBack: () => void;
  onNext: () => void;
}

/**
 * A step that is built on another branch, such as Kort and Områder on
 * Feature-CreateArea. It keeps the step list complete, so the wizard can be
 * tested from start to end.
 */
export function PlaceholderStep({
  title,
  message,
  onBack,
  onNext,
}: PlaceholderStepProps) {
  return (
    <StepShell onBack={onBack} onNext={onNext} title={title}>
      {() => <Alert severity="info">{message}</Alert>}
    </StepShell>
  );
}
