import { Box, ButtonBase, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  type ApplicationStepId,
  applicationSteps,
} from '../application-steps.js';

interface StepSidebarProps {
  currentStep: ApplicationStepId;
  onSelect: (step: ApplicationStepId) => void;
}

/** The list of steps. Selecting one shows it on the right (master-detail). */
export function StepSidebar({ currentStep, onSelect }: StepSidebarProps) {
  const { t } = useTranslation();

  return (
    <Box aria-label={t('applicationWizard.stepsLabel')} component="nav">
      <Box
        component="ol"
        sx={{ display: 'grid', gap: 0.5, listStyle: 'none', m: 0, p: 0 }}
      >
        {applicationSteps.map((step) => {
          const isCurrent = step.id === currentStep;
          return (
            <li key={step.id}>
              <ButtonBase
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(step.id)}
                sx={{
                  backgroundColor: isCurrent ? 'primary.main' : 'transparent',
                  borderRadius: 1,
                  color: isCurrent ? 'primary.contrastText' : 'text.primary',
                  justifyContent: 'flex-start',
                  px: 1.5,
                  py: 0.75,
                  textAlign: 'left',
                  width: '100%',
                  '&:hover': {
                    backgroundColor: isCurrent ? 'primary.dark' : '#F5F5F5',
                  },
                  '&.Mui-focusVisible': {
                    outline: '2px solid #1562AD',
                    outlineOffset: 2,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontWeight: isCurrent ? 600 : 400,
                    overflowWrap: 'anywhere',
                  }}
                  variant="body2"
                >
                  {t(step.labelKey)}
                </Typography>
              </ButtonBase>
            </li>
          );
        })}
      </Box>
    </Box>
  );
}
