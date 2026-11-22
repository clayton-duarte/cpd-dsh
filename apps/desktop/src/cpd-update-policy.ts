/** Fork-owned update admission shared by Desktop main and its sandboxed preload. */

/**
 * Whether the CPD fork admits in-app updates and mandatory update policy.
 * @returns False; CPD releases are managed outside the application.
 */
export function desktopUpdatesEnabled(): boolean {
  return false
}
