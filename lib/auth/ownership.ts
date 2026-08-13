/**
 * Trusted ownership for user-owned API writes.
 * Client-supplied ownership fields never win.
 */
export function trustedWorkspaceId(
  identity: { workspace: { id: string } },
  clientBody?: {
    workspaceId?: unknown;
    userId?: unknown;
    ownerId?: unknown;
    email?: unknown;
  },
): string {
  void clientBody;
  return identity.workspace.id;
}

/**
 * Lookup/mutation filter for a single user-owned record.
 * Always includes owner scope at the query boundary.
 */
export function ownedRecordWhere(id: string, workspaceId: string) {
  return { id, workspaceId };
}
