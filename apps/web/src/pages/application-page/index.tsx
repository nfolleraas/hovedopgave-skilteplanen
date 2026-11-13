import AddRoadOutlinedIcon from '@mui/icons-material/AddRoadOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { routes } from '../../app/router.js';
import CTAButton from '../../components/ui/button/CTAButton.js';
import { visuallyHidden } from '../../components/ui/visuallyHidden';

/** Lists application types and links to the road-permit form. */
export default function ApplicationPage() {
  const { t } = useTranslation();
  return (
    <Box
      aria-labelledby="application-page-title"
      className="application-page"
      component="main"
      id="main-content"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 3,
        justifyContent: 'center',
        alignItems: 'flex-start',
        px: 2,
        py: 6,
      }}
      tabIndex={-1}
    >
      <title>{`${t('application.title')} | ${t('common.brandName')}`}</title>
      <Typography
        component="h1"
        id="application-page-title"
        sx={visuallyHidden}
      >
        {t('application.title')}
      </Typography>
      <CTAButton
        icon={<AddRoadOutlinedIcon />}
        label={t('home.createRoadPermit')}
        to={routes.createRoadPermit}
      />
      <CTAButton
        icon={<EventOutlinedIcon />}
        label={t('home.createRoadPermitEvent')}
        status={t('application.unavailable')}
      />
      <CTAButton
        icon={<ConstructionOutlinedIcon />}
        label={t('home.createDiggingPermit')}
        status={t('application.unavailable')}
      />
    </Box>
  );
}
