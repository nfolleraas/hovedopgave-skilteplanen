import type { ComponentType } from 'react';
import ApplicationPage from '../pages/application-page/index.js';
import ContactsPage from '../pages/contacts-page/index.js';
import BusinessApplicantPage from '../pages/create-applicant-page/business.js';
import PrivateApplicantPage from '../pages/create-applicant-page/private.js';
import HomePage from '../pages/home-page/index.js';
import LoginPage from '../pages/login-page/index.js';
import MessagesPage from '../pages/messages-page/index.js';

export const routes = {
  home: '/',
  application: '/ansoegning',
  contacts: '/kontaktpersoner',
  messages: '/beskeder',
  login: '/login',
  createBusinessApplicant: '/opret-erhverv',
  createPrivateApplicant: '/opret-privat',
} as const;

export const pages: Record<string, ComponentType> = {
  [routes.home]: HomePage,
  [routes.application]: ApplicationPage,
  [routes.contacts]: ContactsPage,
  [routes.messages]: MessagesPage,
  [routes.login]: LoginPage,
  [routes.createBusinessApplicant]: BusinessApplicantPage,
  [routes.createPrivateApplicant]: PrivateApplicantPage,
} as const;
