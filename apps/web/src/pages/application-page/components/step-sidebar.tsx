import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  type ApplicationStepId,
  applicationSteps,
} from '../application-steps.js';

interface StepSidebarProps {
  currentStep: ApplicationStepId;
}

export function StepSidebar({ currentStep }: StepSidebarProps) {
  const { t } = useTranslation();

  return (
    <Box aria-label={t('applicationWizard.stepsLabel')} component="nav">
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {applicationSteps.map((step) => {
          const isCurrent = step.id === currentStep;
          return (
            <Box
              aria-current={isCurrent ? 'step' : undefined}
              component="li"
              key={step.id}
              sx={{
                backgroundColor: isCurrent ? 'primary.main' : 'transparent',
                borderRadius: 1,
                color: isCurrent ? 'primary.contrastText' : 'text.primary',
                px: 1.5,
                py: 0.75,
              }}
            >
              <Typography
                sx={{ fontWeight: isCurrent ? 600 : 400 }}
                variant="body2"
              >
                {t(step.labelKey)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
