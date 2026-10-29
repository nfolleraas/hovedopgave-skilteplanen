import { CableSubtype } from '../enums/cable-subtype.js';
import { CableType } from '../enums/cable-type.js';
import { ExecutionMethod } from '../enums/execution-method.js';
import { WorkCategory } from '../enums/work-category.js';

export class CableTask {
  constructor(
    public id: string,
    public cableType: CableType,
    public cableSubtypes: CableSubtype[],
    public workCategories: WorkCategory[],
    public executionMethods: ExecutionMethod[],
    public cableTypesDescription?: string,
    public cableSubtypesDescription?: string,
    public workCategoriesDescription?: string,
    public executionMethodsDescription?: string,
  ) {}
}
