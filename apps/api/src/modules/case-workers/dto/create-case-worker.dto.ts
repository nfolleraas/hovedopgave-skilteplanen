import { UpdateCaseWorkerDto } from './update-case-worker.dto.js';

export class CreateCaseWorkerDto extends UpdateCaseWorkerDto {
  employeeNumber!: string;
  password!: string;
}
