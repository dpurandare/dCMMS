/**
 * Frontend/backend permission parity.
 *
 * The project has already been bitten by this once: PERMISSION_MIGRATION.md
 * records a duplicated permission vocabulary causing real "Access Denied"
 * bugs, fixed on the frontend on 2026-02-23 while the backend half was left
 * in place (REV-021). Nothing stopped the two lists drifting again, because
 * nothing compared them.
 *
 * This test reads the backend's canonical ROLE_PERMISSIONS as text rather
 * than importing it — the backend is a separate TypeScript project outside
 * this one's rootDir. If either file's shape changes enough that the parse
 * yields nothing, the test fails rather than silently passing.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { ROLE_PERMISSIONS as FRONTEND_ROLE_PERMISSIONS } from '@/lib/permissions';

const BACKEND_PERMISSIONS_FILE = join(
  __dirname,
  '../../../../backend/src/constants/permissions.ts',
);

/** Pull `role: ["perm", ...]` pairs out of a ROLE_PERMISSIONS literal. */
function parseRolePermissions(source: string): Record<string, string[]> {
  const block = source.match(
    /export const ROLE_PERMISSIONS[^=]*=\s*\{([\s\S]*?)\n\};/,
  );
  if (!block) {
    throw new Error('ROLE_PERMISSIONS literal not found — has the file moved?');
  }

  const result: Record<string, string[]> = {};
  const rolePattern = /^\s{2}(\w+):\s*\[([\s\S]*?)^\s{2}\],?$/gm;
  let match: RegExpExecArray | null;
  while ((match = rolePattern.exec(block[1])) !== null) {
    const [, role, body] = match;
    const permissions: string[] = [];
    const permissionPattern = /["']([\w:-]+)["']/g;
    let permission: RegExpExecArray | null;
    while ((permission = permissionPattern.exec(body)) !== null) {
      permissions.push(permission[1]);
    }
    result[role] = permissions;
  }
  return result;
}

describe('RBAC - frontend/backend permission parity', () => {
  const backend = parseRolePermissions(
    readFileSync(BACKEND_PERMISSIONS_FILE, 'utf8'),
  );

  it('parses a non-empty backend permission matrix', () => {
    expect(Object.keys(backend).length).toBeGreaterThan(0);
    for (const [role, permissions] of Object.entries(backend)) {
      expect(permissions.length).toBeGreaterThan(0);
      expect(role).toMatch(/^\w+$/);
    }
  });

  it('lists no permission twice on either side', () => {
    const duplicates = (permissions: readonly string[]) =>
      permissions.filter((p, i) => permissions.indexOf(p) !== i);

    for (const [role, permissions] of Object.entries(backend)) {
      expect({ role, duplicates: duplicates(permissions) }).toEqual({
        role,
        duplicates: [],
      });
    }
    for (const [role, permissions] of Object.entries(
      FRONTEND_ROLE_PERMISSIONS,
    )) {
      expect({ role, duplicates: duplicates(permissions) }).toEqual({
        role,
        duplicates: [],
      });
    }
  });

  it('defines the same roles on both sides', () => {
    expect(Object.keys(backend).sort()).toEqual(
      Object.keys(FRONTEND_ROLE_PERMISSIONS).sort(),
    );
  });

  it.each(Object.keys(FRONTEND_ROLE_PERMISSIONS))(
    'grants %s an identical permission set on both sides',
    (role) => {
      const frontendPermissions = [
        ...FRONTEND_ROLE_PERMISSIONS[
          role as keyof typeof FRONTEND_ROLE_PERMISSIONS
        ],
      ].sort();
      expect([...(backend[role] ?? [])].sort()).toEqual(frontendPermissions);
    },
  );
});
