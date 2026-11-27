import { Alert, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** A message after saving or deleting, read aloud by screen readers. */
export interface AreasNotice {
  severity: 'success' | 'error';
  message: string;
}

interface AreasStepHeaderProps {
  canEdit: boolean;
  notice: AreasNotice | null;
  onCloseNotice: () => void;
}

/**
 * The step heading, the read-only notice and the latest message.
 * @param props - Whether areas can be edited, the notice and its close
 * handler
 * @returns The rendered header
 */
export function AreasStepHeader({
  canEdit,
  notice,
  onCloseNotice,
}: AreasStepHeaderProps) {
  const { t } = useTranslation();
  return (
    <>
      <Typography
        component="h1"
        id="step-title"
        sx={{ mb: 2 }}
        tabIndex={-1}
        variant="h5"
      >
        {t('areas.title')}
      </Typography>
      {!canEdit && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('areas.notEditable')}
        </Alert>
      )}

      <Box aria-live="polite" role="status">
        {notice && (
          <Alert
            onClose={onCloseNotice}
            severity={notice.severity}
            sx={{ mb: 2 }}
          >
            {notice.message}
          </Alert>
        )}
      </Box>
    </>
  );
}
