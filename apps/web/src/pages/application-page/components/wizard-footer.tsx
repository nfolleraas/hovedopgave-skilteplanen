import { Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface WizardFooterProps {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  busy?: boolean;
  /** Text for the next button, e.g. "Indsend" on the last step. */
  nextLabel?: string;
}

export function WizardFooter({
  onBack,
  onNext,
  nextDisabled = false,
  busy = false,
  nextLabel,
}: WizardFooterProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
      <Button
        color="inherit"
        disabled={busy}
        onClick={onBack}
        sx={{ backgroundColor: '#424242', color: 'common.white' }}
        variant="contained"
      >
        {t('applicationWizard.back')}
      </Button>
      <Button
        disabled={nextDisabled || busy}
        onClick={onNext}
        variant="contained"
      >
        {nextLabel ?? t('applicationWizard.next')}
      </Button>
    </Box>
  );
}
