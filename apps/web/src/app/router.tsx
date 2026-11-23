import type { ComponentType } from 'react';
import {
  caseWorkerListPath,
  caseworkerMunicipalityPath,
  updateMunicipalityPath,
} from '../components/layout/app-shell/case-worker-layout.js';
import ApplicationPage from '../pages/application-page';
import CaseWorkersPage from '../pages/case-workers-page';
import CaseworkerMunicipalityPage from '../pages/caseworker-municipality-page';
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
  [caseWorkerListPath]: CaseWorkersPage,
  [caseworkerMunicipalityPath]: CaseworkerMunicipalityPage,
  [updateMunicipalityPath]: CaseworkerMunicipalityPage,
} as const;
