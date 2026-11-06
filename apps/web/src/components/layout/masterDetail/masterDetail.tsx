import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  Paper,
  Typography,
} from '@mui/material';
import { type ReactNode, useId, useState } from 'react';

export type DetailItem = {
  id: string;
  label: string;
  content: ReactNode;
};

type MasterDetailGridProps = {
  items: DetailItem[];
  onSubmit?: () => void;
};

export function MasterDetailGrid({ items, onSubmit }: MasterDetailGridProps) {
  const [selectedId, setSelectedId] = useState(items[0]?.id);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const listId = useId();
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const selectedItem = items[selectedIndex];
  const isLastStep = selectedIndex === items.length - 1;

  return (
    <Box>
      <IconButton
        aria-controls={listId}
        aria-expanded={mobileListOpen}
        aria-label={mobileListOpen ? 'Skjul trin' : 'Vis trin'}
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
          aria-label="Ansøgningens trin"
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
              Din ansøgning
            </Typography>
          </Box>
          <List disablePadding sx={{ p: 1.5 }}>
            {items.map((item, index) => (
              <ListItem
                disablePadding
                key={item.id}
                sx={{ mb: 0.5, '&:last-child': { mb: 0 } }}
              >
                <ListItemButton
                  aria-current={item.id === selectedId ? 'step' : undefined}
                  onClick={() => setSelectedId(item.id)}
                  selected={item.id === selectedId}
                  sx={{
                    minHeight: { xs: 56, md: 72 },
                    gap: 2,
                    px: 2,
                    py: { xs: 1.5, md: 2 },
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#F7F9FC' },
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': { bgcolor: 'primary.dark' },
                    },
                  }}
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
                        item.id === selectedId
                          ? 'rgba(255, 255, 255, 0.2)'
                          : '#F5F5F5',
                      color:
                        item.id === selectedId ? 'inherit' : 'text.secondary',
                      fontSize: { xs: 14, md: 16 },
                      fontWeight: 600,
                    }}
                  >
                    {index + 1}
                  </Box>
                  <Typography
                    sx={{ fontWeight: 600, fontSize: { md: 16 } }}
                    variant="body2"
                  >
                    {item.label}
                  </Typography>
                </ListItemButton>
              </ListItem>
            ))}
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
            {selectedItem?.content}
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'end',
              gap: 2,
              mt: 4,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Button
              disabled={selectedIndex <= 0}
              onClick={() => setSelectedId(items[selectedIndex - 1]?.id)}
              variant="outlined"
            >
              Tilbage
            </Button>
            <Button
              disabled={selectedIndex < 0 || (isLastStep && !onSubmit)}
              onClick={() => {
                if (isLastStep) {
                  onSubmit?.();
                } else {
                  setSelectedId(items[selectedIndex + 1]?.id);
                }
              }}
              variant="contained"
            >
              {isLastStep ? 'Indsend ansøgning' : 'Næste'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
