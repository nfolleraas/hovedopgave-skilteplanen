import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatch } from 'react-router';
import CaseWorkerLayout, {
  updateMunicipalityPath,
} from '../../components/layout/app-shell/case-worker-layout.js';
import UpdateMunicipality from './update-municipality.js';

/** Shows the municipality overview or its edit form. */
export default function CaseworkerMunicipalityPage(): ReactElement {
  const { t } = useTranslation();
  const editing = Boolean(useMatch(updateMunicipalityPath));

  /** Renders the municipality details for the selected municipality. */
  function renderContent(municipalityId: number): ReactElement {
    return (
      <UpdateMunicipality
        editing={editing}
        key={municipalityId}
        municipalityId={municipalityId}
      />
    );
  }

  return (
    <CaseWorkerLayout
      renderContent={renderContent}
      section={editing ? 'municipalityEdit' : 'municipality'}
      title={editing ? t('municipality.update.title') : t('caseworker.title')}
    />
  );
}
