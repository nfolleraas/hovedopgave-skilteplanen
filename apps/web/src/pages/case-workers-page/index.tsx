import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import CaseWorkerLayout from '../../components/layout/app-shell/case-worker-layout.js';
import CaseWorkerList from './components/case-worker-list.js';

/** Opens the caseworker administration page within the municipality layout. */
export default function CaseWorkersPage(): ReactElement {
  const { t } = useTranslation();

  /** Shows the caseworkers for the selected municipality. */
  function renderContent(municipalityId: number): ReactElement {
    return (
      <CaseWorkerList key={municipalityId} municipalityId={municipalityId} />
    );
  }

  return (
    <CaseWorkerLayout
      renderContent={renderContent}
      section="caseWorkers"
      title={t('caseworker.management.title')}
    />
  );
}
