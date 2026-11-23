export interface CaseWorkerInput {
  employeeNumber: string;
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  isSuperUser: boolean;
}

export type CaseWorker = Omit<CaseWorkerInput, 'password'> & {
  municipalityId: number;
};
