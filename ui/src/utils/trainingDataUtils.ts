/**
 * Fetch training image count for an actor
 */
export async function fetchTrainingImageCount(actorId: number): Promise<number> {
  try {
    const response = await fetch(`/api/actors/${actorId}/training-data`);
    if (!response.ok) {
      return 0;
    }
    const data = await response.json();
    return data.total_count || 0;
  } catch (error) {
    console.error(`Failed to fetch training count for actor ${actorId}:`, error);
    return 0;
  }
}
