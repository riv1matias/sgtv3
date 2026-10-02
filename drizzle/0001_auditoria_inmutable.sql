-- Auditoría inmutable: los eventos solo se insertan; UPDATE, DELETE y TRUNCATE se rechazan.
CREATE OR REPLACE FUNCTION eventos_inmutables() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La tabla eventos es de solo inserción (auditoría inmutable)';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER eventos_no_update BEFORE UPDATE OR DELETE ON eventos
  FOR EACH ROW EXECUTE FUNCTION eventos_inmutables();
--> statement-breakpoint
CREATE TRIGGER eventos_no_truncate BEFORE TRUNCATE ON eventos
  FOR EACH STATEMENT EXECUTE FUNCTION eventos_inmutables();
--> statement-breakpoint
-- Búsqueda de códigos por descripción
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS codigos_mo_desc_trgm ON codigos_mo USING gin (descripcion gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS materiales_desc_trgm ON materiales USING gin (descripcion gin_trgm_ops);
