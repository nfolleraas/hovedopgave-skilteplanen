import AddRoadOutlinedIcon from '@mui/icons-material/AddRoadOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { routes } from '../../app/router.js';
import CTAButton from '../../components/ui/button/CTAButton.js';

export default function ApplicationPage() {
  const { t } = useTranslation();

  return (
    <Box
      component="main"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        justifyContent: 'center',
        px: 2,
        py: 6,
      }}
    >
      <CTAButton
        icon={<AddRoadOutlinedIcon />}
        label={t('home.createRoadPermit')}
        to={routes.createRoadPermit}
      />
      <CTAButton
        icon={<EventOutlinedIcon />}
        label={t('home.createRoadPermitEvent')}
        to={routes.application}
      />
      <CTAButton
        icon={<ConstructionOutlinedIcon />}
        label={t('home.createDiggingPermit')}
        to={routes.application}
      />
    </Box>
  );
}
