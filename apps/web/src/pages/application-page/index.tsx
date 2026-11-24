import AddRoadOutlinedIcon from '@mui/icons-material/AddRoadOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import { Box, Link, List, ListItem, Paper, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink, useNavigate } from 'react-router';
import {
  type ApplicationDraftSummary,
  createRoadPermitDraft,
  listApplicationDrafts,
} from '../../api/roadPermit.api';
import { routes } from '../../app/router.js';
import CTAButton from '../../components/ui/button/CTAButton.js';
import { visuallyHidden } from '../../components/ui/visuallyHidden';

/** Builds the form URL for a saved or newly created road-permit draft. */
function draftLocation(caseNumber: string) {
  return {
    pathname: routes.createRoadPermit,
    search: new URLSearchParams({ draft: caseNumber }).toString(),
  };
}

/** Lists saved drafts with links to the forms that can be reopened. */
function ApplicationDraftList() {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<ApplicationDraftSummary[] | null>();

  useEffect(() => {
    let active = true;
    void listApplicationDrafts().then(
      (items) => {
        if (active) setDrafts(items);
      },
      () => {
        if (active) setDrafts(null);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <Paper
      aria-labelledby="application-drafts-heading"
      component="section"
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: 708,
        border: 1,
        borderColor: 'divider',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Typography component="h2" id="application-drafts-heading" variant="h5">
        {t('application.drafts.heading')} ({drafts?.length})
      </Typography>
      <Typography color="text.secondary" role="status">
        {drafts === undefined && t('application.drafts.loading')}
        {drafts?.length === 0 && t('application.drafts.empty')}
      </Typography>
      {drafts === null && (
        <Typography color="error.dark" role="alert">
          {t('application.drafts.loadError')}
        </Typography>
      )}
      {Boolean(drafts?.length) && (
        <List disablePadding sx={{ mt: 1 }}>
          {drafts?.map(({ caseNumber, title, canResume }) => {
            const label = title.trim() || t('application.drafts.untitled');
            return (
              <ListItem
                disableGutters
                key={caseNumber}
                sx={{
                  display: 'block',
                  overflowWrap: 'anywhere',
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                {canResume ? (
                  <Link
                    component={RouterLink}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: 44,
                    }}
                    to={draftLocation(caseNumber)}
                  >
                    {label}
                  </Link>
                ) : (
                  <Typography>{label}</Typography>
                )}
                <Typography color="text.secondary" variant="body2">
                  {t('application.drafts.caseNumber', { caseNumber })}
                </Typography>
              </ListItem>
            );
          })}
        </List>
      )}
    </Paper>
  );
}

/** Lists application types and the saved drafts. */
export default function ApplicationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftError, setDraftError] = useState(false);

  /** Opens the form only after the API has assigned a case number. */
  async function startDraft() {
    if (creatingDraft) return;
    setCreatingDraft(true);
    setDraftError(false);
    try {
      const { caseNumber } = await createRoadPermitDraft();
      void navigate(draftLocation(caseNumber));
    } catch {
      setDraftError(true);
    } finally {
      setCreatingDraft(false);
    }
  }

  return (
    <Box
      aria-labelledby="application-page-title"
      className="application-page"
      component="main"
      id="main-content"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        alignItems: 'center',
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
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 3,
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <CTAButton
          disabled={creatingDraft}
          icon={<AddRoadOutlinedIcon />}
          label={
            creatingDraft
              ? t('application.creatingDraft')
              : t('home.createRoadPermit')
          }
          onClick={startDraft}
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
      <Typography
        role="status"
        sx={{ textAlign: 'center', '&:empty': { display: 'none' } }}
      >
        {draftError && t('application.createDraftError')}
      </Typography>
      {import.meta.env.DEV && <ApplicationDraftList />}
    </Box>
  );
}
