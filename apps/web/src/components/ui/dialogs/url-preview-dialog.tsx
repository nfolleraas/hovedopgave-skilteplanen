import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

type UrlPreviewDialogProps = {
  onClose: () => void;
  title: string;
  url: string;
};

/**
 * Displays a URL in a responsive iframe dialog.
 * @param props - The URL, accessible title, and close callback
 * @returns A responsive URL preview dialog
 */
export default function UrlPreviewDialog({
  onClose,
  title,
  url,
}: UrlPreviewDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const titleId = useId();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      aria-labelledby={titleId}
      fullScreen={isSmallScreen}
      fullWidth
      maxWidth="lg"
      onClose={onClose}
      open
    >
      <DialogTitle sx={{ overflowWrap: 'anywhere', pr: 7 }}>
        <Box component="span" id={titleId}>
          {title}
        </Box>
        <Tooltip title={t('urlPreview.openInNewTab')}>
          <IconButton
            aria-label={t('urlPreview.openInNewTab')}
            href={url}
            rel="noopener noreferrer"
            sx={{ ml: 1, verticalAlign: 'middle' }}
            target="_blank"
          >
            <OpenInNewIcon />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <IconButton
        aria-label={t('urlPreview.close')}
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8 }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent
        dividers
        sx={{ display: 'flex', minHeight: { xs: 0, sm: '70dvh' }, p: 0 }}
      >
        <Box
          component="iframe"
          src={url}
          sx={{ border: 0, flex: 1, width: '100%' }}
          title={title}
        />
      </DialogContent>
    </Dialog>
  );
}
