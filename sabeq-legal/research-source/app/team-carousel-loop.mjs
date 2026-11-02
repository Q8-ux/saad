/** Keep the same visual offset within the middle of three identical copies.
 * @param {number} position
 * @param {number} period
 */
export function centeredTeamOffset(position, period) {
  if (!Number.isFinite(position) || !Number.isFinite(period) || period <= 0) return position;
  return period + ((position % period) + period) % period;
}
