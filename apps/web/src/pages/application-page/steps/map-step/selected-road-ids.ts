/** Id of a road's ownership field, so the map step can focus it. */
export function roadOwnershipId(roadId: string): string {
  return `road-ownership-${roadId}`;
}
