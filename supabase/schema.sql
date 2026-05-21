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
