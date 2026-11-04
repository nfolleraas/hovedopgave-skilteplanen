import { Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { WizardFooter } from './wizard-footer.js';

interface PlaceholderStepProps {
  title: string;
  onBack: () => void;
  onNext: () => void;
  isLast: boolean;
}

/** Shown for application steps that are not built yet. */
export function PlaceholderStep({
  title,
  onBack,
  onNext,
  isLast,
}: PlaceholderStepProps) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="step-title">
      <Typography component="h1" id="step-title" sx={{ mb: 2 }} variant="h5">
        {title}
      </Typography>
      <Typography color="text.secondary">
        {t('applicationWizard.stepNotBuilt')}
      </Typography>
      <WizardFooter nextDisabled={isLast} onBack={onBack} onNext={onNext} />
    </section>
  );
}
