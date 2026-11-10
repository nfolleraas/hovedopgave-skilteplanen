import type { ComponentType } from 'react';
import ActorsPage from '../pages/actors-page';
import ContactsPage from '../pages/contacts-page';
import HomePage from '../pages/home-page';
import LoginPage from '../pages/login-page';
import MessagesPage from '../pages/messages-page';

export const routes = {
  home: '/',
  application: '/ansoegning',
  selectedApplication: '/ansoegning/:caseNumber',
  contacts: '/kontaktpersoner',
  messages: '/beskeder',
  login: '/login',
} as const;

export const pages: Record<string, ComponentType> = {
  [routes.home]: HomePage,
  [routes.application]: ActorsPage,
  [routes.selectedApplication]: ActorsPage,
  [routes.contacts]: ContactsPage,
  [routes.messages]: MessagesPage,
  [routes.login]: LoginPage,
} as const;
