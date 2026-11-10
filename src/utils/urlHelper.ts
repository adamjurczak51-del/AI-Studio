/**
 * URL Helper to ensure generated invite links and share links work publicly
 * for invited family members, phones, and friends without hitting Google 403 Forbidden screens.
 */

export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://ais-dev-ptp7mu6a5rt22psqkjkpdz-20365823493.europe-west3.run.app';
  }

  const origin = window.location.origin;

  // If running on localhost, 127.0.0.1, or file://, use the active live server URL
  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    window.location.protocol === 'file:'
  ) {
    return 'https://ais-dev-ptp7mu6a5rt22psqkjkpdz-20365823493.europe-west3.run.app';
  }

  return origin;
}

/**
 * Builds a direct invite URL for a specific member token, embedding household & member metadata
 * directly so the receiving phone immediately displays the invitation without network delay or 404s.
 */
export function buildInviteUrl(
  token: string,
  details?: {
    householdId?: string;
    householdName?: string;
    targetMemberId?: string;
    targetMemberName?: string;
    targetRole?: string;
    invitedBy?: string;
  }
): string {
  const baseUrl = getPublicAppUrl();
  const params = new URLSearchParams();
  params.set('invite', token);
  if (details?.householdId) params.set('hh', details.householdId);
  if (details?.householdName) params.set('hn', details.householdName);
  if (details?.targetMemberId) params.set('m', details.targetMemberId);
  if (details?.targetMemberName) params.set('n', details.targetMemberName);
  if (details?.targetRole) params.set('r', details.targetRole);
  if (details?.invitedBy) params.set('by', details.invitedBy);

  return `${baseUrl}/?${params.toString()}`;
}

