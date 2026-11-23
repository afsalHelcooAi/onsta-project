BEGIN;

DROP TABLE IF EXISTS platform_admin_invitations;

DELETE FROM user_roles ur
USING roles r
WHERE ur.role_id = r.id
  AND r.scope = 'PLATFORM'
  AND r.name <> 'SUPER_ADMIN';

DELETE FROM roles
WHERE scope = 'PLATFORM'
  AND name <> 'SUPER_ADMIN';

DELETE FROM permissions
WHERE permission_key LIKE 'platform.%';

COMMIT;
