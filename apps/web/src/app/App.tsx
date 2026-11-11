import { Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router';
import Footer from '../components/layout/footer/footer.js';
import Navbar from '../components/layout/navbar/navbar.js';
import ActorsLayout from '../pages/actors-page/actors-layout.js';
import ActorsPage from '../pages/actors-page/index.js';
import CreateActorPage from '../pages/create-actor-page/index.js';
import UpdateActorPage from '../pages/update-actor-page/index.js';
import { pages, routes } from './router.js';

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main id="main-content" tabIndex={-1}>
      <Container sx={{ py: 8 }}>
        <Typography component="h1" variant="h4">
          {t('notFound.title')}
        </Typography>
      </Container>
    </main>
  );
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Spring til hovedindhold
      </a>
      <Navbar />
      <Routes>
        {[routes.application, routes.selectedApplication].map((path) => (
          <Route element={<ActorsLayout />} key={path} path={path}>
            <Route element={<ActorsPage />} index />
            <Route element={<CreateActorPage />} path="actors/create" />
            <Route element={<UpdateActorPage />} path="actors/:uuid/edit" />
          </Route>
        ))}
        {Object.entries(pages).map(([path, Page]) => (
          <Route element={<Page />} key={path} path={path} />
        ))}
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
      <Footer />
    </>
  );
}
