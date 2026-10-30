import { Address } from './address.js';
import { CaseWorker } from './case-worker.js';

export class Municipality {
  constructor(
    public id: number,
    public name: string,
    public region: string,
    public email: string,
    public phoneNumber: string,
    public address: Address,
    public caseWorkers: CaseWorker[],
  ) {}
}
