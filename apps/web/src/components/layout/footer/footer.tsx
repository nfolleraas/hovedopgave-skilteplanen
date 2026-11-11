import { Box, Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const sections = [
    {
      title: t('footer.shortcuts'),
      items: [t('footer.aboutUs'), t('footer.faq'), t('footer.contact')],
    },
    {
      title: t('footer.information'),
      items: [
        t('footer.privacyPolicy'),
        t('footer.cookiePolicy'),
        t('footer.terms'),
      ],
    },
  ];

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
            overflowWrap: 'anywhere',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'minmax(0, 2fr) repeat(3, minmax(0, 1fr))',
            },
          }}
        >
          <Box>
            <Typography color="inherit" component="h2" variant="h6">
              {t('common.brandName')}
            </Typography>
            <Typography sx={{ mt: 1 }} variant="body2">
              {t('footer.companyDescriptionPlaceholder')}
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
              {t('footer.contact')}
            </Typography>
            <Typography sx={{ mt: 1 }} variant="body2">
              {t('footer.emailPlaceholder')}
            </Typography>
            <Typography variant="body2">
              {t('footer.phonePlaceholder')}
            </Typography>
            <Typography variant="body2">
              {t('footer.addressPlaceholder')}
            </Typography>
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
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </Typography>
          <Typography variant="body2">
            {t('footer.socialLinksPlaceholder')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
