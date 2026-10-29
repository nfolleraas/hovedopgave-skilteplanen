import { Address } from './address.js';
import { Municipality } from './municipality.js';

export class CaseWorker {
  constructor(
    public employeeNumber: string,
    public name: string,
    public email: string,
    public passwordHash: string,
    public phoneNumber: string,
    public address: Address,
    public isSuperUser: boolean = false,
    public municipality: Municipality,
  ) {}
}
