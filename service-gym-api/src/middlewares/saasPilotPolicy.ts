/**
 * Pilot rollout policy shared by the Render API authorization middleware.
 * The feature is disabled unless both the flag and the exact test gym ID match.
 */
export function shouldCheckSaaSAccess(
  role: string | null | undefined,
  gymId: number | null | undefined,
  enabled: string | undefined,
  selectedGymId: string | undefined
): boolean {
  if (role !== "admin" || gymId == null || !Number.isSafeInteger(gymId) || gymId <= 0) {
    return false;
  }
  if (enabled !== "true" || !selectedGymId || !/^\d+$/.test(selectedGymId)) {
    return false;
  }
  const selected = Number(selectedGymId);
  return Number.isSafeInteger(selected) && selected > 0 && selected === gymId;
}
