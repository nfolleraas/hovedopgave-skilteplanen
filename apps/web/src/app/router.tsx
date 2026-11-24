import type { ComponentType } from 'react';
import ApplicationPage from '../pages/application-page';
import CreateRoadPermitPage from '../pages/application-page/create-road-permit';
import ContactsPage from '../pages/contacts-page';
import HomePage from '../pages/home-page';
import LoginPage from '../pages/login-page';
import MessagesPage from '../pages/messages-page';

export const routes = {
  home: '/',
  application: '/ansoegning',
  createRoadPermit: '/ansoegning/opret-vejtilladelse',
  contacts: '/kontaktpersoner',
  messages: '/beskeder',
  login: '/login',
} as const;

export const pages: Record<string, ComponentType> = {
  [routes.home]: HomePage,
  [routes.application]: ApplicationPage,
  [routes.createRoadPermit]: CreateRoadPermitPage,
  [routes.contacts]: ContactsPage,
  [routes.messages]: MessagesPage,
  [routes.login]: LoginPage,
} as const;
