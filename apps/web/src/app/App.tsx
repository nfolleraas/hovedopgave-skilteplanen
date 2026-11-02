import { Container, Typography } from '@mui/material';
import type { ComponentType } from 'react';
import Footer from '../components/layout/footer/footer.js';
import Navbar from '../components/layout/navbar/navbar.js';
import ApplicationPage from '../pages/application-page/index.js';
import ContactsPage from '../pages/contacts-page/index.js';
import HomePage from '../pages/home-page/index.js';
import LoginPage from '../pages/login-page/index.js';
import MessagesPage from '../pages/messages-page/index.js';
import { routes } from './router.js';

const pages: Record<string, ComponentType> = {
  [routes.home]: HomePage,
  [routes.application]: ApplicationPage,
  [routes.contacts]: ContactsPage,
  [routes.messages]: MessagesPage,
  [routes.login]: LoginPage,
};

function NotFoundPage() {
  return (
    <main>
      <Container sx={{ py: 8 }}>
        <Typography component="h1" variant="h4">
          Siden blev ikke fundet
        </Typography>
      </Container>
    </main>
  );
}

export default function App() {
  const CurrentPage = pages[window.location.pathname] ?? NotFoundPage;

  return (
    <>
      <Navbar />
      <CurrentPage />
      <Footer />
    </>
  );
}
