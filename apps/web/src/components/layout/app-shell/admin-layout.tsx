import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AdminSidebar from '../sidebar/sidebar.js';
import SidebarLayout from './sidebar-layout.js';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation();

  return (
    <SidebarLayout
      menuLabel={t('admin.openMenu')}
      renderSidebar={(onNavigate) => <AdminSidebar onNavigate={onNavigate} />}
    >
      {children}
    </SidebarLayout>
  );
}
