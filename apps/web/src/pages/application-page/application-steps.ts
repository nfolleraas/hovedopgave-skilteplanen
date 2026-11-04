export const applicationSteps = [
  {
    id: 'municipalityAndPeriod',
    labelKey: 'applicationWizard.steps.municipalityAndPeriod',
  },
  { id: 'tasks', labelKey: 'applicationWizard.steps.tasks' },
  { id: 'otherActors', labelKey: 'applicationWizard.steps.otherActors' },
  { id: 'contactInfo', labelKey: 'applicationWizard.steps.contactInfo' },
  { id: 'map', labelKey: 'applicationWizard.steps.map' },
  { id: 'areas', labelKey: 'applicationWizard.steps.areas' },
  {
    id: 'signPlanAndTraffic',
    labelKey: 'applicationWizard.steps.signPlanAndTraffic',
  },
  { id: 'documents', labelKey: 'applicationWizard.steps.documents' },
  { id: 'summary', labelKey: 'applicationWizard.steps.summary' },
] as const;

export type ApplicationStepId = (typeof applicationSteps)[number]['id'];
