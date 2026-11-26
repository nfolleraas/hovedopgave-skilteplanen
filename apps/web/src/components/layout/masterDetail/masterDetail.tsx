import CheckIcon from '@mui/icons-material/Check';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import {
  Alert,
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { visuallyHidden } from '../../ui/visuallyHidden';

export type DetailItem = {
  id: string;
  label: string;
  heading?: string;
  headingWidth?: number;
  content: ReactNode | ((showErrors: boolean) => ReactNode);
  validationErrors?: string[];
};

type MasterDetailGridProps = {
  items: DetailItem[];
  onSubmit?: () => void;
  showStepValidation?: boolean;
};

/** Renders the application steps, their content, and the controls for navigation and submission. */
export function MasterDetailGrid({
  items,
  onSubmit,
  showStepValidation = false,
}: MasterDetailGridProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(items[0]?.id);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState(new Set<string>());
  const [focusRequest, setFocusRequest] = useState<{
    target: 'heading' | 'error';
  }>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const validationAlert = useRef<HTMLDivElement>(null);
  const listId = useId();
  const progressId = useId();
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const selectedItem = items[selectedIndex];
  const isLastStep = selectedIndex === items.length - 1;
  const showErrors = checkedSteps.has(selectedId);
  const progress = t('permit.steps.progress', {
    step: selectedIndex + 1,
    total: items.length,
  });

  useEffect(() => {
    if (focusRequest?.target === 'error') validationAlert.current?.focus();
    if (focusRequest?.target === 'heading') headingRef.current?.focus();
  }, [focusRequest]);

  /** Selects a step, closes the mobile step list, and schedules focus for its heading or error summary. */
  function goToStep(id: string, target: 'heading' | 'error' = 'heading') {
    setSelectedId(id);
    setMobileListOpen(false);
    setFocusRequest({ target });
  }

  function recordValidation(id: string) {
    setCheckedSteps((steps) =>
      steps.has(id) ? steps : new Set(steps).add(id),
    );
  }

  function selectStep(id: string) {
    if (showStepValidation && id !== selectedId) recordValidation(selectedId);
    goToStep(id);
  }

  /** Validates the current step before advancing and checks every step before submitting. */
  function handleNext() {
    const invalidItem = isLastStep
      ? items.find((item) => item.validationErrors?.length)
      : selectedItem;
    if (invalidItem?.validationErrors?.length) {
      recordValidation(invalidItem.id);
      goToStep(invalidItem.id, 'error');
      return;
    }

    if (isLastStep) {
      onSubmit?.();
    } else {
      if (showStepValidation) recordValidation(selectedId);
      goToStep(items[selectedIndex + 1].id);
    }
  }

  if (!selectedItem) return null;

  return (
    <Box>
      <IconButton
        aria-controls={listId}
        aria-expanded={mobileListOpen}
        aria-label={
          mobileListOpen ? t('permit.steps.hide') : t('permit.steps.show')
        }
        color="primary"
        onClick={() => setMobileListOpen((open) => !open)}
        size="large"
        sx={{ display: { xs: 'inline-flex', md: 'none' }, mb: 2 }}
      >
        {mobileListOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'clamp(280px, 24vw, 360px) minmax(0, 1fr)',
            lg: 'minmax(clamp(280px, 24vw, 360px), 1fr) minmax(0, 880px) minmax(0, 1fr)',
          },
          alignItems: 'start',
          gap: { xs: 2, md: 4 },
          width: '100%',
        }}
      >
        <Paper
          aria-label={t('permit.steps.navigation')}
          component="nav"
          elevation={0}
          id={listId}
          sx={{
            display: { xs: mobileListOpen ? 'block' : 'none', md: 'block' },
            width: { xs: '100%', md: 'clamp(280px, 24vw, 360px)' },
            ml: {
              xs: 0,
              lg: 'min(96px, max(0px, calc(100% - 360px)))',
            },
            flexShrink: 0,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(18, 75, 122, 0.08)',
            boxSizing: 'border-box',
            maxHeight: { xs: '70svh', md: 'none' },
            overflowY: 'auto',
          }}
        >
          <Box
            sx={{
              p: 3,
              bgcolor: '#F7F9FC',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography component="h2" sx={{ fontWeight: 600 }} variant="h6">
              {t('permit.steps.heading')}
            </Typography>
          </Box>
          <List component="ol" disablePadding sx={{ p: 1.5 }}>
            {items.map((item, index) => {
              const isSelected = item.id === selectedId;
              const validationErrors = item.validationErrors ?? [];
              const validationStatus =
                showStepValidation && checkedSteps.has(item.id)
                  ? validationErrors.length
                    ? 'error'
                    : 'success'
                  : undefined;
              const statusId = `${listId}-${item.id}-status`;
              const StatusIcon =
                validationStatus === 'error' ? PriorityHighIcon : CheckIcon;

              return (
                <ListItem
                  disablePadding
                  key={item.id}
                  sx={{ mb: 0.5, '&:last-child': { mb: 0 } }}
                >
                  <Tooltip
                    arrow
                    describeChild
                    leaveDelay={150}
                    placement="right"
                    slotProps={{
                      tooltip: {
                        sx: {
                          bgcolor: 'grey.800',
                          fontSize: 14,
                          lineHeight: 1.6,
                          px: 1.5,
                          py: 1,
                        },
                      },
                      arrow: { sx: { color: 'grey.800' } },
                    }}
                    title={
                      validationStatus === 'error' && (
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {validationErrors.map((message) => (
                            <li key={message}>{message}</li>
                          ))}
                        </Box>
                      )
                    }
                  >
                    <ListItemButton
                      aria-current={isSelected ? 'step' : undefined}
                      aria-describedby={validationStatus ? statusId : undefined}
                      component="button"
                      onClick={() => selectStep(item.id)}
                      selected={isSelected}
                      sx={(theme) => {
                        const statusColor = validationStatus
                          ? theme.palette[validationStatus].main
                          : undefined;
                        const tint = statusColor && alpha(statusColor, 0.12);
                        const hoverTint =
                          statusColor && alpha(statusColor, 0.2);
                        return {
                          minHeight: { xs: 56, md: 72 },
                          gap: 2,
                          width: '100%',
                          textAlign: 'start',
                          overflowWrap: 'anywhere',
                          px: 2,
                          py: { xs: 1.5, md: 2 },
                          borderRadius: 2,
                          bgcolor: tint,
                          '&:hover': { bgcolor: hoverTint ?? '#F7F9FC' },
                          '&.Mui-selected': {
                            bgcolor: tint ?? 'primary.main',
                            color: tint
                              ? 'text.primary'
                              : 'primary.contrastText',
                            boxShadow: tint
                              ? `inset 0 0 0 2px ${theme.palette.primary.main}`
                              : undefined,
                            '&:hover': { bgcolor: hoverTint ?? 'primary.dark' },
                          },
                          '&.Mui-focusVisible': {
                            outline: '2px solid',
                            outlineColor: 'primary.dark',
                            outlineOffset: 2,
                          },
                        };
                      }}
                      type="button"
                    >
                      <Box
                        aria-hidden="true"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: { xs: 32, md: 40 },
                          height: { xs: 32, md: 40 },
                          flexShrink: 0,
                          borderRadius: '50%',
                          bgcolor:
                            isSelected && !validationStatus
                              ? 'rgba(255, 255, 255, 0.2)'
                              : '#F5F5F5',
                          fontSize: { xs: 14, md: 16 },
                          fontWeight: 600,
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: isSelected ? 700 : 600,
                          fontSize: { md: 16 },
                        }}
                        variant="body2"
                      >
                        {item.label}
                      </Typography>
                      {validationStatus && (
                        <StatusIcon
                          fontSize="small"
                          sx={{
                            color: `${validationStatus}.dark`,
                            flexShrink: 0,
                            marginInlineStart: 'auto',
                          }}
                        />
                      )}
                    </ListItemButton>
                  </Tooltip>
                  {validationStatus && (
                    <Box component="span" id={statusId} sx={visuallyHidden}>
                      {validationStatus === 'error'
                        ? [
                            t('permit.steps.needsAttention'),
                            ...validationErrors,
                          ].join(' ')
                        : t('permit.steps.complete')}
                    </Box>
                  )}
                </ListItem>
              );
            })}
          </List>
        </Paper>
        <Paper
          elevation={0}
          sx={{
            minWidth: 0,
            width: '100%',
            maxWidth: { md: 880 },
            justifySelf: 'center',
            display: 'flex',
            flexDirection: 'column',
            minHeight: { xs: 480, md: 560 },
            '& .MuiOutlinedInput-root:not(.Mui-error):not(.Mui-focused) .MuiOutlinedInput-notchedOutline':
              { borderColor: 'text.secondary' },
            '& .MuiFormLabel-root.Mui-error, & .MuiFormHelperText-root.Mui-error':
              { color: 'error.dark' },
            boxSizing: 'border-box',
            borderRadius: 3,
            p: { xs: 2, md: 4 },
          }}
        >
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Typography id={progressId} sx={visuallyHidden} variant="body2">
              {progress}
            </Typography>
            <Typography
              aria-describedby={progressId}
              component="h2"
              data-route-heading=""
              ref={headingRef}
              sx={{
                mb: 3,
                maxWidth: selectedItem.headingWidth,
                mx: 'auto',
                overflowWrap: 'anywhere',
              }}
              tabIndex={-1}
              variant="h5"
            >
              {selectedItem.heading ?? selectedItem.label}
            </Typography>
            {showErrors && Boolean(selectedItem.validationErrors?.length) && (
              <Alert
                ref={validationAlert}
                severity="error"
                sx={{ mb: 3, overflowWrap: 'anywhere' }}
                tabIndex={-1}
              >
                <Typography component="p" sx={{ fontWeight: 600 }}>
                  {t('permit.errors.heading')}
                </Typography>
                <Box component="ul" sx={{ my: 0, pl: 3 }}>
                  {selectedItem.validationErrors?.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </Box>
              </Alert>
            )}
            {typeof selectedItem.content === 'function'
              ? selectedItem.content(showErrors)
              : selectedItem.content}
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'end',
              gap: 2,
              mt: 4,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
              '& .MuiButton-root': { minHeight: 44, whiteSpace: 'normal' },
            }}
          >
            <Button
              disabled={selectedIndex <= 0}
              onClick={() => goToStep(items[selectedIndex - 1].id)}
              variant="outlined"
            >
              {t('permit.actions.back')}
            </Button>
            <Button
              disabled={isLastStep && !onSubmit}
              onClick={handleNext}
              variant="contained"
            >
              {isLastStep
                ? t('permit.actions.submit')
                : t('permit.actions.next')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
