import {
  Alert,
  Box,
  Button,
  List,
  ListItem,
  Paper,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { ContactPersonEntry } from '../../../../features/contact-persons/contact-person-edit-state.js';
import {
  actorRoleLabelKeys,
  availabilityLabelKeys,
  formatPhoneNumber,
} from '../../../../features/contact-persons/contact-person-labels.js';
import type { ContactPersonActor } from '../../../../types/contact-person.types.js';

/** Element ids, so the step can move focus into the list. */
export const contactListIds = {
  add: 'contacts-add-new',
  edit: (key: string) => `contact-${key}-edit`,
  delete: (key: string) => `contact-${key}-delete`,
};

interface ContactListProps {
  actors: ContactPersonActor[];
  entries: ContactPersonEntry[];
  /** The contact person shown in the form, if any. */
  activeKey: string | null;
  canEdit: boolean;
  /** True while the form has unsaved changes. */
  addDisabled: boolean;
  onAdd: () => void;
  onEdit: (entry: ContactPersonEntry) => void;
  onDelete: (entry: ContactPersonEntry) => void;
}

interface ActorGroup {
  key: string;
  title: string;
  entries: ContactPersonEntry[];
}

/**
 * The contact persons as cards, grouped by actor (UC-032 step 2). Each card
 * has buttons to edit or delete it; the form opens next to the list.
 */
export function ContactList({
  actors,
  entries,
  activeKey,
  canEdit,
  addDisabled,
  onAdd,
  onEdit,
  onDelete,
}: ContactListProps) {
  const { t } = useTranslation();
  const savedCount = entries.filter((entry) => entry.saved).length;

  // Only actors with contact persons get a group, as in the wireframe.
  const groups: ActorGroup[] = actors
    .map((actor) => ({
      key: actor.uuid,
      title: t('contacts.actorGroup', {
        role: t(actorRoleLabelKeys[actor.role]),
        name: actor.name,
      }),
      entries: entries.filter((entry) => entry.actorId === actor.uuid),
    }))
    .filter((group) => group.entries.length > 0);
  // The API only returns contact persons for actors on the application, so
  // this group is a safeguard that keeps them visible if that ever changes.
  const orphans = entries.filter(
    (entry) => !actors.some((actor) => actor.uuid === entry.actorId),
  );
  if (orphans.length > 0) {
    groups.push({
      key: 'unknown-actor',
      title: t('contacts.unknownActor'),
      entries: orphans,
    });
  }

  return (
    <Box aria-labelledby="contact-list-title" component="section">
      <Typography
        component="h2"
        id="contact-list-title"
        sx={{ fontWeight: 600, mb: 1.5 }}
        variant="body1"
      >
        {t('contacts.listTitle', { number: savedCount })}
      </Typography>

      {actors.length === 0 ? (
        <Alert severity="info">{t('contacts.noActors')}</Alert>
      ) : (
        entries.length === 0 && (
          <Typography color="text.secondary" variant="body2">
            {t('contacts.none')}
          </Typography>
        )
      )}

      <Box sx={{ display: 'grid', gap: 2 }}>
        {groups.map((group) => (
          <Box key={group.key}>
            <Typography
              color="text.secondary"
              component="h3"
              sx={{ fontWeight: 600, mb: 1 }}
              variant="body2"
            >
              {group.title}
            </Typography>
            <List disablePadding sx={{ display: 'grid', gap: 1 }}>
              {group.entries.map((entry) => (
                <ListItem disablePadding key={entry.key}>
                  <ContactCard
                    canEdit={canEdit}
                    entry={entry}
                    isActive={entry.key === activeKey}
                    onDelete={() => onDelete(entry)}
                    onEdit={() => onEdit(entry)}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Box>

      {canEdit && actors.length > 0 && (
        <Button
          disabled={addDisabled}
          id={contactListIds.add}
          onClick={onAdd}
          sx={{ mt: 2 }}
          variant="contained"
        >
          {t('contacts.addContact')}
        </Button>
      )}
    </Box>
  );
}

interface ContactCardProps {
  entry: ContactPersonEntry;
  isActive: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

/** One contact person, like an area card on the Områder step. */
function ContactCard({
  entry,
  isActive,
  canEdit,
  onEdit,
  onDelete,
}: ContactCardProps) {
  const { t } = useTranslation();
  const { saved } = entry;

  // A new contact person is a dashed placeholder until it is saved.
  if (!saved) {
    return (
      <Paper
        sx={{ border: '2px dashed #1562AD', px: 2, py: 1.5, width: '100%' }}
        variant="outlined"
      >
        <Typography component="span" sx={{ fontWeight: 600 }}>
          {t('contacts.newContact')}
        </Typography>
        <Typography color="text.secondary" component="span" variant="body2">
          {` ${t('contacts.fillInForm')}`}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        border: isActive ? '2px solid #1562AD' : '1px solid #BDBDBD',
        width: '100%',
        display: 'flex',
        gap: 2,
        justifyContent: 'space-between',
        px: 2,
        py: 1.5,
      }}
      variant="outlined"
    >
      <Box sx={{ minWidth: 0 }}>
        <Box
          sx={{
            alignItems: 'baseline',
            columnGap: 1,
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
            {saved.name}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {t(availabilityLabelKeys[saved.availability])}
          </Typography>
        </Box>
        <Typography color="text.secondary" variant="body2">
          {formatPhoneNumber(saved.phoneNumber)}
        </Typography>
        <Typography
          color="text.secondary"
          sx={{ overflowWrap: 'anywhere' }}
          variant="body2"
        >
          {saved.email}
        </Typography>
        {isActive && (
          <Typography color="primary" sx={{ mt: 0.5 }} variant="body2">
            {t('contacts.openInForm')}
          </Typography>
        )}
      </Box>

      {canEdit && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
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
              size="small"
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
            size="small"
            variant="outlined"
          >
            {t('contacts.delete')}
          </Button>
        </Box>
      )}
    </Paper>
  );
}
