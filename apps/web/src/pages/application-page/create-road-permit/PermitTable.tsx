import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { ReactNode } from 'react';
import { visuallyHidden } from '../../../components/ui/visuallyHidden';

type PermitTableProps = {
  label: string;
  columns: { label: string; align?: 'right' }[];
  rows: { id: string; cells: ReactNode[] }[];
  outlined?: boolean;
};

/** Renders a permit table with header associations and visible field labels on narrow screens. */
export function PermitTable({
  label,
  columns,
  rows,
  outlined,
}: PermitTableProps) {
  return (
    <TableContainer
      sx={
        outlined
          ? { border: 1, borderColor: 'divider', borderRadius: 2 }
          : undefined
      }
    >
      <Table
        aria-label={label}
        role="table"
        size="small"
        sx={{
          overflowWrap: 'anywhere',
          border: "1px solid grey",
          '& .MuiTableCell-root': { verticalAlign: 'top' },
          '@media (max-width: 699px)': {
            display: 'block',
            '& thead': visuallyHidden,
            '& tbody, & tr': { display: 'block' },
            '& tr + tr': { borderTop: 1, borderColor: 'divider' },
            '& .MuiTableCell-root': {
              display: 'block',
              border: 0,
              textAlign: 'start',
              px: 2,
              py: 0.75,
            },
          },
        }}
      >
        <TableHead
          role="rowgroup"
          sx={outlined ? { bgcolor: '#F7F9FC' } : undefined}
        >
          <TableRow role="row">
            {columns.map(({ label, align }) => (
              <TableCell
                align={align}
                key={label}
                role="columnheader"
                scope="col"
              >
                {label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody role="rowgroup">
          {rows.map(({ id, cells }) => (
            <TableRow key={id} role="row">
              {cells.map((cell, index) => {
                const { label, align } = columns[index];
                return (
                  <TableCell
                    align={align}
                    component={index === 0 ? 'th' : 'td'}
                    key={label}
                    role={index === 0 ? 'rowheader' : 'cell'}
                    scope={index === 0 ? 'row' : undefined}
                  >
                    {index !== 0 && (
                      <Box
                        aria-hidden="true"
                        component="span"
                        sx={{
                          display: 'none',
                          '@media (max-width: 699px)': {
                            display: 'block',
                            fontWeight: 600,
                          },
                        }}
                      >
                        {label}
                      </Box>
                    )}
                    {cell}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
