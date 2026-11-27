/**
 * Builds the id of a road's ownership field, so the map step can focus it.
 * @param roadId - The id of the road
 * @returns The element id
 */
export function roadOwnershipId(roadId: string): string {
  return `road-ownership-${roadId}`;
}
