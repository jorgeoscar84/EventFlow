-- RLS (Row-Level Security) — red de seguridad multi-tenant (PRD/09 §9.1, PRD/02 §2.3)
-- Política base: la fila es visible si su "tenantId" coincide con el contexto de sesión
-- fijado por la app: SELECT set_config('app.tenant_id', '<uuid>', true);
--
-- NOTA IMPORTANTE (ver DECISIONS ADR-009):
-- La app se conecta vía Prisma con el rol propietario (postgres), que por defecto
-- IGNORA RLS. Por eso, en esta fase la PRIMERA línea de defensa es el filtrado por
-- tenantId en la capa de aplicación (packages/core). Estas políticas quedan
-- preparadas para cuando se introduzca un rol restringido (fase de hardening).

-- Helper: tenant actual del contexto de sesión.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'TenantUsage','User','Role','Event','Registration','Payment',
    'SmtpSetting','Integration','MessageTemplate','MessageCampaign',
    'Raffle','AiAgentConfig','AiKnowledgeSource','AiKnowledgeChunk',
    'AiConversation','AiUsage'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant());',
      t
    );
  END LOOP;
END $$;
