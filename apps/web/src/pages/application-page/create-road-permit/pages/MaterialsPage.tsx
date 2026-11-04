import {
  Box,
  Button,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import {
  emptyMaterialDraft,
  type MaterialDraft,
  type MaterialEntry,
} from '../formTypes';

const materialTypes = ['Container', 'Stillads', 'Andet'];

type MaterialsPageProps = {
  materials: MaterialEntry[];
  draft: MaterialDraft;
  onMaterialsChange: (materials: MaterialEntry[]) => void;
  onDraftChange: (draft: MaterialDraft) => void;
};

export function MaterialsPage({
  materials,
  draft,
  onMaterialsChange,
  onDraftChange,
}: MaterialsPageProps) {
  const [submitted, setSubmitted] = useState(false);
  const quantity = Number(draft.quantity);
  const validType = materialTypes.includes(draft.type);
  const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1;

  function saveMaterial() {
    setSubmitted(true);
    if (!validType || !validQuantity) return;

    const entry: MaterialEntry = {
      id: draft.editingId ?? crypto.randomUUID(),
      type: draft.type,
      quantity,
      notes: draft.notes.trim(),
    };

    onMaterialsChange(
      draft.editingId
        ? materials.map((material) =>
            material.id === draft.editingId ? entry : material,
          )
        : [...materials, entry],
    );
    onDraftChange({ ...emptyMaterialDraft });
    setSubmitted(false);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography component="h2" variant="h5">
          Materiale
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }} variant="body2">
          Tilføj de materialer, der skal placeres på vejarealet.
        </Typography>
      </Box>

      <Box
        component="form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          saveMaterial();
        }}
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 96px',
            gap: 2,
          }}
        >
          <TextField
            error={submitted && !validType}
            fullWidth
            helperText={
              submitted && !validType ? 'Vælg en materialetype.' : undefined
            }
            id="material-type"
            label="Materiale type"
            name="materialType"
            onChange={(event) =>
              onDraftChange({ ...draft, type: event.target.value })
            }
            select
            value={draft.type}
          >
            <MenuItem disabled value="">
              Vælg materiale...
            </MenuItem>
            {materialTypes.map((material) => (
              <MenuItem key={material} value={material}>
                {material}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            error={submitted && !validQuantity}
            helperText={
              submitted && !validQuantity
                ? 'Angiv et helt tal på mindst 1.'
                : undefined
            }
            id="material-quantity"
            label="Antal"
            name="materialQuantity"
            onChange={(event) =>
              onDraftChange({ ...draft, quantity: event.target.value })
            }
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
            type="number"
            value={draft.quantity}
          />
        </Box>
        <TextField
          fullWidth
          id="material-notes"
          label="Evt. bemærkninger"
          minRows={2}
          multiline
          name="materialNotes"
          onChange={(event) =>
            onDraftChange({ ...draft, notes: event.target.value })
          }
          placeholder="Angiv evt. bemærkninger til materialetypen"
          value={draft.notes}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: "end" }}>
          <Button type="submit" variant="contained">
            {draft.editingId ? 'Gem ændringer' : 'Tilføj materiale +'}
          </Button>
          {draft.editingId && (
            <Button
              onClick={() => {
                onDraftChange({ ...emptyMaterialDraft });
                setSubmitted(false);
              }}
              variant="outlined"
            >
              Annuller
            </Button>
          )}
        </Box>
      </Box>

      <Box aria-labelledby="material-list-heading" component="section">
        <Typography
          component="h3"
          id="material-list-heading"
          sx={{ mb: 2 }}
          variant="body1"
        >
          Materialeliste
        </Typography>
        {materials.length === 0 ? (
          <Box
            sx={{
              p: 3,
              bgcolor: '#F7F9FC',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
            }}
          >
            <Typography color="text.secondary" variant="body2">
              Ingen materialer tilføjet endnu.
            </Typography>
          </Box>
        ) : (
          <TableContainer
            sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
          >
            <Table
              aria-label="Tilføjede materialer"
              size="small"
              sx={{ minWidth: 520 }}
            >
              <TableHead sx={{ bgcolor: '#F7F9FC' }}>
                <TableRow>
                  <TableCell>Materiale</TableCell>
                  <TableCell align="right">Antal</TableCell>
                  <TableCell>Bemærkninger</TableCell>
                  <TableCell align="right">Handlinger</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {materials.map((material) => (
                  <TableRow
                    key={material.id}
                    sx={{
                      '&:last-child td, &:last-child th': { borderBottom: 0 },
                    }}
                  >
                    <TableCell component="th" scope="row">
                      {material.type}
                    </TableCell>
                    <TableCell align="right">{material.quantity}</TableCell>
                    <TableCell sx={{ maxWidth: 240, overflowWrap: 'anywhere' }}>
                      {material.notes || '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          aria-label={`Rediger ${material.type}`}
                          onClick={() => {
                            onDraftChange({
                              type: material.type,
                              quantity: String(material.quantity),
                              notes: material.notes,
                              editingId: material.id,
                            });
                            setSubmitted(false);
                          }}
                          size="small"
                        >
                          Rediger
                        </Button>
                        <Button
                          aria-label={`Fjern ${material.type}`}
                          color="error"
                          onClick={() => {
                            onMaterialsChange(
                              materials.filter(
                                (entry) => entry.id !== material.id,
                              ),
                            );
                            if (draft.editingId === material.id) {
                              onDraftChange({ ...emptyMaterialDraft });
                              setSubmitted(false);
                            }
                          }}
                          size="small"
                        >
                          Fjern
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
}
