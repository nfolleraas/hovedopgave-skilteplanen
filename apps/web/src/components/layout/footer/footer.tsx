import { Box, Container, Typography } from '@mui/material';

const sections = [
  {
    title: 'Genveje',
    items: ['Om os', 'Ofte stillede spørgsmål', 'Kontakt'],
  },
  {
    title: 'Information',
    items: ['Privatlivspolitik', 'Cookiepolitik', 'Vilkår og betingelser'],
  },
];

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: 'primary.main',
        color: 'common.white',
        mt: 'auto',
        py: { xs: 4, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gap: 4,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: '2fr repeat(3, 1fr)',
            },
          }}
        >
          <Box>
            <Typography color="inherit" component="h2" variant="h6">
              Skilteplanen
            </Typography>
            <Typography sx={{ mt: 1 }} variant="body2">
              [Kort beskrivelse af virksomheden]
            </Typography>
          </Box>

          {sections.map((section) => (
            <Box component="section" key={section.title}>
              <Typography color="inherit" component="h2" variant="subtitle1">
                {section.title}
              </Typography>
              <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: 1, p: 0 }}>
                {section.items.map((item) => (
                  <Box component="li" key={item} sx={{ mb: 0.75 }}>
                    <Typography variant="body2">{item}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}

          <Box component="section">
            <Typography color="inherit" component="h2" variant="subtitle1">
              Kontakt
            </Typography>
            <Typography sx={{ mt: 1 }} variant="body2">
              [E-mailadresse]
            </Typography>
            <Typography variant="body2">[Telefonnummer]</Typography>
            <Typography variant="body2">[Adresse]</Typography>
          </Box>
        </Box>

        <Box
          sx={{
            borderTop: '1px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
            justifyContent: 'space-between',
            mt: 4,
            pt: 2,
          }}
        >
          <Typography variant="body2">
            © {new Date().getFullYear()} Skilteplanen. Alle rettigheder
            forbeholdes.
          </Typography>
          <Typography variant="body2">[Links til sociale medier]</Typography>
        </Box>
      </Container>
    </Box>
  );
}
