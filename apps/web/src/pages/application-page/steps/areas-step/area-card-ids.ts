/** Element ids, so the areas step can move focus to a card. */
export const areaCardIds = {
  /**
   * Builds the id of a card's title.
   * @param areaKey - The key of the area
   * @returns The element id
   */
  title: (areaKey: string) => `area-${areaKey}-title`,
  /**
   * Builds the id of a card's road heading.
   * @param areaKey - The key of the area
   * @returns The element id
   */
  road: (areaKey: string) => `area-${areaKey}-road`,
  /**
   * Builds the id of a card's Edit button.
   * @param areaKey - The key of the area
   * @returns The element id
   */
  edit: (areaKey: string) => `area-${areaKey}-edit`,
  /**
   * Builds the id of a card's Delete button.
   * @param areaKey - The key of the area
   * @returns The element id
   */
  delete: (areaKey: string) => `area-${areaKey}-delete`,
};
