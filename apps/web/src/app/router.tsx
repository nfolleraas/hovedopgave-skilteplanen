import type { ComponentType } from 'react';
import ApplicationPage from '../pages/application-page';
import HomePage from '../pages/home-page';
import LoginPage from '../pages/login-page';
import MessagesPage from '../pages/messages-page';

export const routes = {
  home: '/',
  application: '/ansoegning',
  messages: '/beskeder',
  login: '/login',
} as const;

export const pages: Record<string, ComponentType> = {
  [routes.home]: HomePage,
  [routes.application]: ApplicationPage,
  [routes.messages]: MessagesPage,
  [routes.login]: LoginPage,
} as const;
