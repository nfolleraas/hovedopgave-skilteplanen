import type { ComponentType } from 'react';
import ApplicationPage from '../pages/application-page';
import CaseworkerMunicipalityPage, {
  caseworkerMunicipalityPath,
  updateMunicipalityPath,
} from '../pages/caseworker-municipality-page';
import ContactsPage from '../pages/contacts-page';
import CreateMunicipalityPage from '../pages/create-municipality-page';
import HomePage from '../pages/home-page';
import LoginPage from '../pages/login-page';
import MessagesPage from '../pages/messages-page';

export const routes = {
  home: '/',
  application: '/ansoegning',
  contacts: '/kontaktpersoner',
  messages: '/beskeder',
  login: '/login',
  createMunicipality: '/admin/kommuner/opret',
} as const;

export const pages: Record<string, ComponentType> = {
  [routes.home]: HomePage,
  [routes.application]: ApplicationPage,
  [routes.contacts]: ContactsPage,
  [routes.messages]: MessagesPage,
  [routes.login]: LoginPage,
  [routes.createMunicipality]: CreateMunicipalityPage,
  [caseworkerMunicipalityPath]: CaseworkerMunicipalityPage,
  [updateMunicipalityPath]: CaseworkerMunicipalityPage,
} as const;
