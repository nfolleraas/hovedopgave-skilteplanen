import { CableSubtype } from '../enums/cable-subtype.js';
import { CableType } from '../enums/cable-type.js';
import { ExecutionMethod } from '../enums/execution-method.js';
import { WorkCategory } from '../enums/work-category.js';

export class CableTask {
  constructor(
    public id: string,
    public cableType: CableType,
    public cableTypesDescription: string | null,
    public cableSubtypes: CableSubtype[],
    public cableSubtypesDescription: string | null,
    public workCategories: WorkCategory[],
    public workCategoriesDescription: string | null,
    public executionMethods: ExecutionMethod[],
    public executionMethodsDescription: string | null,
  ) {}
}
