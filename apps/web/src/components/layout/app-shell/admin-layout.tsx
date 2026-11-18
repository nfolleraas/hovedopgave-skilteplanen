import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AdminSidebar from '../sidebar/sidebar.js';
import SidebarLayout from './sidebar-layout.js';

interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * Renders the administration menu in the shared sidebar layout and places the
 * administrator page in the main content area.
 */
export default function AdminLayout({
  children,
}: AdminLayoutProps): ReactElement {
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
