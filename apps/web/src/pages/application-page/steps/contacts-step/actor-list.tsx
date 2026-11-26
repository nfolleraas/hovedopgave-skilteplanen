import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Alert,
  Box,
  Button,
  Collapse,
  List,
  ListItem,
  Paper,
  Typography,
} from '@mui/material';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ContactPersonEntry } from '../../../../features/contact-persons/contact-person-edit-state.js';
import {
  actorRoleLabelKeys,
  availabilityLabelKeys,
  formatPhoneNumber,
} from '../../../../features/contact-persons/contact-person-labels.js';
import type { ContactPersonActor } from '../../../../types/contact-person.types.js';
import { contactListIds } from './contact-step-ids.js';

type HeadingLevel = 2 | 3;
type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5';

function headingTag(level: number): HeadingTag {
  return `h${level}` as HeadingTag;
}

interface ActorListProps {
  actors: ContactPersonActor[];
  entries: ContactPersonEntry[];
  /** The contact person shown in the form, if any. */
  activeKey: string | null;
  canEdit: boolean;
  /** True while the form has unsaved changes. */
  addDisabled: boolean;
  /** Excavation permits show the contact person's availability. */
  showAvailability: boolean;
  /** Level of the actor headings; 3 when the page renders the step's h2. */
  headingLevel: HeadingLevel;
  /** The open form, shown inside the actor it belongs to. */
  form: ReactNode;
  onAdd: (actorId: string) => void;
  onEdit: (entry: ContactPersonEntry) => void;
  onDelete: (entry: ContactPersonEntry) => void;
}

/**
 * The actors on the application, each a collapsible section with its details
 * and its contact persons (UC-032 step 2). All sections start collapsed; the
 * section with the open form stays open.
 */
export function ActorList({
  actors,
  entries,
  activeKey,
  canEdit,
  addDisabled,
  showAvailability,
  headingLevel,
  form,
  onAdd,
  onEdit,
  onDelete,
}: ActorListProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string[]>([]);
  const activeActorId = entries.find(
    (entry) => entry.key === activeKey,
  )?.actorId;

  // The API only returns contact persons for actors on the application, so
  // this is a safeguard that keeps them visible if that ever changes.
  const orphans = entries.filter(
    (entry) =>
      entry.saved && !actors.some((actor) => actor.uuid === entry.actorId),
  );

  function toggle(actorId: string) {
    setExpanded((current) =>
      current.includes(actorId)
        ? current.filter((id) => id !== actorId)
        : [...current, actorId],
    );
  }

  const contactsProps = {
    activeKey,
    canEdit,
    showAvailability,
    headingLevel: headingLevel + 1,
    onEdit,
    onDelete,
  };

  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }} variant="outlined">
      {actors.length === 0 && (
        <Alert severity="info" sx={{ m: 2 }}>
          {t('contacts.noActors')}
        </Alert>
      )}

      {actors.map((actor, index) => (
        <ActorSection
          actor={actor}
          headingLevel={headingLevel}
          isFirst={index === 0}
          // The form's section cannot be closed while the form is open.
          isLocked={actor.uuid === activeActorId}
          isOpen={expanded.includes(actor.uuid) || actor.uuid === activeActorId}
          key={actor.uuid}
          onToggle={() => toggle(actor.uuid)}
        >
          <ContactPersons
            {...contactsProps}
            addButton={
              canEdit && (
                <Button
                  aria-label={t('contacts.addContactFor', {
                    name: actor.name,
                  })}
                  disabled={addDisabled}
                  id={contactListIds.add(actor.uuid)}
                  onClick={() => onAdd(actor.uuid)}
                  variant="contained"
                >
                  {t('contacts.addContact')}
                </Button>
              )
            }
            entries={entries.filter(
              (entry) => entry.saved && entry.actorId === actor.uuid,
            )}
            form={actor.uuid === activeActorId ? form : null}
            title={t('contacts.contactsHeading')}
          />
        </ActorSection>
      ))}

      {orphans.length > 0 && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 3 }}>
          <ContactPersons
            {...contactsProps}
            entries={orphans}
            form={null}
            title={t('contacts.unknownActor')}
          />
        </Box>
      )}

      {/* Placeholder: managing actors belongs to another use case. */}
      <Box
        sx={{
          alignItems: 'center',
          backgroundColor: '#F5F5F5',
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          justifyContent: 'flex-end',
          px: 3,
          py: 2,
        }}
      >
        <Typography
          color="text.secondary"
          id="actor-actions-pending"
          sx={{ flex: '1 1 16rem' }}
          variant="body2"
        >
          {t('contacts.actorActionsPending')}
        </Typography>
        <Button disabled variant="contained">
          {t('contacts.createActor')}
        </Button>
      </Box>
    </Paper>
  );
}

interface ActorSectionProps {
  actor: ContactPersonActor;
  headingLevel: HeadingLevel;
  isFirst: boolean;
  isOpen: boolean;
  isLocked: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** One actor: a header that shows or hides its details and contacts. */
function ActorSection({
  actor,
  headingLevel,
  isFirst,
  isOpen,
  isLocked,
  onToggle,
  children,
}: ActorSectionProps) {
  const { t } = useTranslation();
  const headingId = `actor-${actor.uuid}-heading`;
  const bodyId = `actor-${actor.uuid}-body`;

  return (
    <Box
      aria-labelledby={headingId}
      component="section"
      sx={
        isFirst ? undefined : { borderTop: '1px solid', borderColor: 'divider' }
      }
    >
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          px: 3,
          py: 2,
        }}
      >
        <Typography
          component={headingTag(headingLevel)}
          id={headingId}
          sx={{ flex: '1 1 14rem', m: 0, minWidth: 0 }}
          variant="body1"
        >
          <Button
            aria-controls={bodyId}
            aria-disabled={isLocked || undefined}
            aria-expanded={isOpen}
            endIcon={isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            fullWidth
            onClick={isLocked ? undefined : onToggle}
            sx={{
              fontSize: '1rem',
              justifyContent: 'space-between',
              minHeight: 44,
              overflowWrap: 'anywhere',
              textAlign: 'left',
            }}
          >
            {actor.name}
          </Button>
        </Typography>
        {/* Placeholders: managing actors belongs to another use case. */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            aria-describedby="actor-actions-pending"
            disabled
            variant="outlined"
          >
            {t('contacts.updateActor')}
          </Button>
          <Button
            aria-describedby="actor-actions-pending"
            color="error"
            disabled
            variant="outlined"
          >
            {t('contacts.deleteActor')}
          </Button>
        </Box>
      </Box>

      <Collapse id={bodyId} in={isOpen} unmountOnExit>
        <Box sx={{ backgroundColor: '#F7F9FC', display: 'grid', gap: 3, p: 3 }}>
          <ActorDetails actor={actor} />
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

/** The actor's details as label and value pairs in two columns. */
function ActorDetails({ actor }: { actor: ContactPersonActor }) {
  const { t } = useTranslation();
  const { street, houseNumber, postalCode, city } = actor.address;
  const notProvided = t('contacts.notProvided');
  const rows: [string, string][] = [
    [t('contacts.actorFields.role'), t(actorRoleLabelKeys[actor.role])],
    [
      t('contacts.actorFields.phoneNumber'),
      formatPhoneNumber(actor.phoneNumber),
    ],
    [t('contacts.actorFields.email'), actor.email],
    [
      t('contacts.actorFields.address'),
      `${street} ${houseNumber}, ${postalCode} ${city}`,
    ],
    [t('contacts.actorFields.cvrNumber'), actor.cvrNumber || notProvided],
    [t('contacts.actorFields.department'), actor.department || notProvided],
  ];

  return (
    <Box
      component="dl"
      sx={{
        columnGap: 4,
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'repeat(2, minmax(0, 1fr))',
        },
        m: 0,
        rowGap: 2,
      }}
    >
      {rows.map(([label, value]) => (
        <div key={label}>
          <Typography color="text.secondary" component="dt" variant="body2">
            {label}
          </Typography>
          <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>
            {value}
          </Typography>
        </div>
      ))}
    </Box>
  );
}

interface ContactPersonsProps {
  title: string;
  entries: ContactPersonEntry[];
  activeKey: string | null;
  canEdit: boolean;
  showAvailability: boolean;
  headingLevel: number;
  form: ReactNode;
  addButton?: ReactNode;
  onEdit: (entry: ContactPersonEntry) => void;
  onDelete: (entry: ContactPersonEntry) => void;
}

/** The contact persons of one actor, the open form and the add button. */
function ContactPersons({
  title,
  entries,
  activeKey,
  canEdit,
  showAvailability,
  headingLevel,
  form,
  addButton,
  onEdit,
  onDelete,
}: ContactPersonsProps) {
  const { t } = useTranslation();

  return (
    <Paper sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }} variant="outlined">
      <Typography
        component={headingTag(headingLevel)}
        sx={{ fontWeight: 600, mb: 2 }}
        variant="h6"
      >
        {title}
      </Typography>

      {entries.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          {t('contacts.none')}
        </Typography>
      ) : (
        <List disablePadding sx={{ display: 'grid', gap: 1.5, mb: 2 }}>
          {entries.map((entry) => (
            <ListItem disablePadding key={entry.key}>
              <ContactCard
                canEdit={canEdit}
                entry={entry}
                isActive={entry.key === activeKey}
                onDelete={() => onDelete(entry)}
                onEdit={() => onEdit(entry)}
                showAvailability={showAvailability}
              />
            </ListItem>
          ))}
        </List>
      )}

      {form && <Box sx={{ mb: 2 }}>{form}</Box>}

      {addButton && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          {addButton}
        </Box>
      )}
    </Paper>
  );
}

interface ContactCardProps {
  entry: ContactPersonEntry;
  isActive: boolean;
  canEdit: boolean;
  showAvailability: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/** One saved contact person with buttons to edit or delete it. */
function ContactCard({
  entry,
  isActive,
  canEdit,
  showAvailability,
  onEdit,
  onDelete,
}: ContactCardProps) {
  const { t } = useTranslation();
  const { saved } = entry;
  if (!saved) return null;

  return (
    <Box
      sx={{
        backgroundColor: '#F7F9FC',
        border: '2px solid',
        borderColor: isActive ? 'primary.main' : 'transparent',
        borderRadius: 1,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        justifyContent: 'space-between',
        p: 2,
        width: '100%',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
          {saved.name}
        </Typography>
        <Typography>
          {t('contacts.phoneLine', {
            phone: formatPhoneNumber(saved.phoneNumber),
          })}
        </Typography>
        <Typography sx={{ overflowWrap: 'anywhere' }}>
          {t('contacts.emailLine', { email: saved.email })}
        </Typography>
        {showAvailability && (
          <Typography>
            {t('contacts.availabilityLine', {
              availability: t(availabilityLabelKeys[saved.availability]),
            })}
          </Typography>
        )}
        {isActive && (
          <Typography color="primary" sx={{ mt: 0.5 }} variant="body2">
            {t('contacts.openInForm')}
          </Typography>
        )}
      </Box>

      {canEdit && (
        <Box
          sx={{
            alignItems: 'flex-start',
            display: 'flex',
            flexShrink: 0,
            gap: 1,
          }}
        >
          {/* Hidden while the form is open, like Redigér on an area. */}
          {!isActive && (
            <Button
              aria-label={t('contacts.editContactFor', { name: saved.name })}
              id={contactListIds.edit(entry.key)}
              onClick={onEdit}
              variant="outlined"
            >
              {t('contacts.edit')}
            </Button>
          )}
          <Button
            aria-label={t('contacts.deleteContactFor', { name: saved.name })}
            color="error"
            id={contactListIds.delete(entry.key)}
            onClick={onDelete}
            variant="outlined"
          >
            {t('contacts.delete')}
          </Button>
        </Box>
      )}
    </Box>
  );
}
