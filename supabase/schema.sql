-- ============================================================
-- Casino Círculo de la Unión de Elizondo
-- Schema completo de base de datos — archivo de referencia
--
-- YA EJECUTADO en Supabase. Este archivo existe solo como
-- documentación y control de versiones del esquema.
-- Para aplicar cambios: usar el SQL Editor de Supabase.
-- ============================================================


-- ============================================================
-- TABLA: anuncios
-- Tablón de anuncios visible en la zona de socios.
-- ============================================================

create table anuncios (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null,
  cuerpo            text not null,
  fecha_publicacion date not null default current_date,
  activo            boolean not null default true
);

alter table anuncios enable row level security;

create policy "Lectura pública de anuncios"
  on anuncios
  for select
  to anon
  using (true);


-- ============================================================
-- TABLA: actas
-- url_pdf apunta al PDF alojado en GitHub Pages (docs/actas/)
-- o en Supabase Storage (URL completa).
-- ============================================================

create table actas (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null,
  fecha             date not null,
  descripcion_breve text,
  url_pdf           text not null
);

alter table actas enable row level security;

create policy "Lectura pública de actas"
  on actas
  for select
  to anon
  using (true);


-- ============================================================
-- TABLA: socios_directorio
-- mostrar_telefono controla visibilidad del teléfono en la web.
-- ============================================================

create table socios_directorio (
  id               uuid primary key default gen_random_uuid(),
  nombre_completo  text not null,
  telefono         text,
  mostrar_telefono boolean not null default false
);

alter table socios_directorio enable row level security;

create policy "Lectura pública del directorio"
  on socios_directorio
  for select
  to anon
  using (true);


-- ============================================================
-- TABLA: eventos
-- El JS filtra por activo = true y fecha >= hoy.
-- ============================================================

create table eventos (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  fecha       date not null,
  hora        time,
  descripcion text,
  activo      boolean not null default true
);

alter table eventos enable row level security;

create policy "Lectura pública de eventos"
  on eventos
  for select
  to anon
  using (true);


-- ============================================================
-- DATOS DE EJEMPLO
-- Borrar o actualizar antes del lanzamiento público.
-- ============================================================

insert into anuncios (titulo, cuerpo, fecha_publicacion, activo) values
  (
    'Bienvenidos a la nueva web del Casino',
    'Estreno de la página web del Casino Círculo de la Unión de Elizondo. Desde aquí los socios podrán consultar anuncios, actas, el directorio y los próximos eventos.',
    current_date,
    true
  ),
  (
    'Comida de San Antón',
    'El próximo 17 de enero celebramos la festividad de nuestro patrón San Antón con la comida anual de socios. Se ruega confirmar asistencia a la junta directiva antes del día 10.',
    current_date - interval '5 days',
    true
  );

insert into actas (titulo, fecha, descripcion_breve, url_pdf) values
  (
    'Acta Junta General Ordinaria — Enero 2025',
    '2025-01-20',
    'Aprobación de cuentas del ejercicio 2024 y renovación parcial de la junta directiva.',
    'docs/actas/acta-enero-2025.pdf'
  ),
  (
    'Acta Junta Extraordinaria — Octubre 2024',
    '2024-10-15',
    'Aprobación de obras de mantenimiento en la cocina.',
    'docs/actas/acta-octubre-2024.pdf'
  );

insert into socios_directorio (nombre_completo, telefono, mostrar_telefono) values
  ('Amorena Goñi, Juan',       '600 000 001', true),
  ('Dolagaray Iriarte, María', '600 000 002', false),
  ('Elizondo Urrutia, Pedro',  null,          false),
  ('Iñarra Subiza, Ana',       '600 000 003', true);

-- NOTA: las fechas de eventos deben ser >= la fecha actual del día de prueba.
-- Actualizar cuando se acerquen o pasen.
insert into eventos (titulo, fecha, hora, descripcion, activo) values

  (
    'Junta General Ordinaria',
    '2026-06-15',
    '19:00',
    'Reunión anual de socios. Orden del día disponible en el tablón de anuncios.',
    true
  ),
  (
    'Vermut de verano',
    '2026-06-28',
    '12:30',
    'Vermut informal de fin de temporada para socios y familias. Sin reserva previa.',
    true
  ),
  (
    'Visita cultural al Palacio de Arizkunenea',
    '2026-07-12',
    '11:00',
    'Excursión organizada por la junta. Plazas limitadas — confirmar asistencia antes del 5 de julio.',
    true
  ),
  (
    'Comida de San Antón',
    '2027-01-17',
    '14:00',
    'Comida anual en honor a nuestro patrón. Solo socios. Confirmación previa obligatoria.',
    true
  );


-- ============================================================
-- MIGRACIÓN v2 — Panel de administración
-- Ejecutar en el SQL Editor de Supabase en este orden.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Nueva tabla: documentos (reemplaza a `actas`)
--    PASO 1: crear tabla + migrar datos. PASO 2: drop table actas.
-- ------------------------------------------------------------

create table documentos (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  tipo        text not null check (tipo in ('acta','convocatoria','estatutos','normativa','comunicado','otros')),
  fecha       date not null,
  descripcion text,
  url_storage text not null,   -- URL pública del archivo en Supabase Storage (bucket "documentos")
  visibilidad text not null default 'socios' check (visibilidad in ('socios','junta')),
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table documentos enable row level security;

create policy "Lectura pública de documentos"
  on documentos for select to anon using (true);

-- Migrar datos de actas → documentos (ejecutar antes de drop table actas)
insert into documentos (titulo, tipo, fecha, descripcion, url_storage, visibilidad)
select titulo, 'acta', fecha, descripcion_breve, url_pdf, 'socios'
from actas;

-- Eliminar tabla actas (solo tras verificar la migración)
drop table actas;


-- ------------------------------------------------------------
-- 2. Ampliar socios_directorio con columnas nuevas
-- ------------------------------------------------------------

alter table socios_directorio
  add column if not exists email       text,
  add column if not exists cargo_junta text,     -- NULL = no es de la junta
  add column if not exists activo      boolean not null default true,
  add column if not exists fecha_alta  date default current_date,
  add column if not exists notas       text;


-- ------------------------------------------------------------
-- 3. Nueva tabla: sugerencias (anónimas, desde zona de socios)
-- ------------------------------------------------------------

create table sugerencias (
  id     uuid primary key default gen_random_uuid(),
  texto  text not null,
  fecha  timestamptz not null default now(),
  estado text not null default 'nueva' check (estado in ('nueva','leída','archivada'))
);

alter table sugerencias enable row level security;

create policy "Inserción pública de sugerencias"
  on sugerencias for insert to anon with check (true);

create policy "Lectura para admin autenticado"
  on sugerencias for select to authenticated using (true);

create policy "Actualización para admin autenticado"
  on sugerencias for update to authenticated using (true);


-- ------------------------------------------------------------
-- 4. Políticas de escritura para admin autenticado (Supabase Auth)
-- ------------------------------------------------------------

create policy "Admin puede insertar anuncios"   on anuncios for insert to authenticated with check (true);
create policy "Admin puede actualizar anuncios"  on anuncios for update to authenticated using (true);
create policy "Admin puede eliminar anuncios"    on anuncios for delete to authenticated using (true);

create policy "Admin puede insertar eventos"     on eventos for insert to authenticated with check (true);
create policy "Admin puede actualizar eventos"   on eventos for update to authenticated using (true);
create policy "Admin puede eliminar eventos"     on eventos for delete to authenticated using (true);

create policy "Admin puede insertar documentos"  on documentos for insert to authenticated with check (true);
create policy "Admin puede actualizar documentos" on documentos for update to authenticated using (true);
create policy "Admin puede eliminar documentos"  on documentos for delete to authenticated using (true);

create policy "Admin puede insertar socios"      on socios_directorio for insert to authenticated with check (true);
create policy "Admin puede actualizar socios"    on socios_directorio for update to authenticated using (true);
create policy "Admin puede eliminar socios"      on socios_directorio for delete to authenticated using (true);


-- ------------------------------------------------------------
-- 5. Pasos manuales en el dashboard de Supabase:
--
--    a) Storage → New bucket → nombre: "documentos" → Public: activado
--    b) Subir PDFs de docs/ al bucket y actualizar url_storage en tabla documentos
--    c) Authentication → Users → Create user:
--       email: casinocirculounion@gmail.com  /  contraseña: CasinoElizondo_1861!
-- ------------------------------------------------------------
