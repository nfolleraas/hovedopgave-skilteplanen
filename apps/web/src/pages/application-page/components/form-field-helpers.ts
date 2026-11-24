/** Shows the label above the field, as in the wireframe, instead of inside. */
export const labelAboveSlots = {
  inputLabel: {
    shrink: true,
    sx: {
      color: 'text.primary',
      fontSize: 14,
      fontWeight: 600,
      mb: 0.75,
      position: 'static',
      transform: 'none',
    },
  },
  input: { notched: false },
};

/** Turns a field path such as `actors.<id>.email` into a valid element id. */
export function fieldId(path: string): string {
  return `field-${path.replace(/[^a-zA-Z0-9-]/g, '-')}`;
}
