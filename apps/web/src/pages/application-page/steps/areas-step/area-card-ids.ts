/** Element ids, so the areas step can move focus to a card. */
export const areaCardIds = {
  title: (areaKey: string) => `area-${areaKey}-title`,
  road: (areaKey: string) => `area-${areaKey}-road`,
  edit: (areaKey: string) => `area-${areaKey}-edit`,
  delete: (areaKey: string) => `area-${areaKey}-delete`,
};
