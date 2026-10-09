-- Ayni - Plataforma de rescate de alimentos
-- Modelo de 4 entidades (negocio, comedor, publicación, detalle), según la sección 5.7.1 del documento: el comedor que reclama y
-- la fecha del reclamo se guardan como columnas de la propia publicación, no en una tabla aparte. 

-- Este script borra y recrea todo desde cero. Así que profesora puede ejecutarlo de manera directa en supabase.

drop table if exists reclamos;
drop table if exists publicacion_detalle;
drop table if exists publicaciones;
drop table if exists negocios;
drop table if exists comedores;

-- 1) Negocios donantes
create table negocios (
  id         bigint generated always as identity primary key,
  nombre     text not null unique,
  tipo       text not null default 'restaurante',
  zona       text not null,
  direccion  text not null default '',
  created_at timestamptz not null default now()
);

-- 2) Comedores / ollas comunes receptores
create table comedores (
  id          bigint generated always as identity primary key,
  nombre      text not null unique,
  tipo        text not null default 'olla comun',
  zona        text not null,
  responsable text not null,
  created_at  timestamptz not null default now()
);

-- 3) Publicaciones de excedentes (cabecera). El comedor que reclama y la fecha del reclamo viven aquí mismo: quedan vacíos hasta que alguien reclama la publicación (RN05, RN07).
create table publicaciones (
  id             bigint generated always as identity primary key,
  negocio_id     bigint not null references negocios(id),
  hora_limite    timestamptz not null,
  estado         text not null default 'disponible'
                 check (estado in ('disponible','reclamada','vencida')),
  comedor_id     bigint references comedores(id),
  fecha_reclamo  timestamptz,
  created_at     timestamptz not null default now()
);

-- 4) Detalle de cada publicación (los productos donados)
create table publicacion_detalle (
  id              bigint generated always as identity primary key,
  publicacion_id  bigint not null references publicaciones(id) on delete cascade,
  producto        text not null,
  cantidad        integer not null check (cantidad > 0),
  unidad          text not null default 'unidad'
);

-- 5) Datos de ejemplo: varios negocios donantes y varios comedores receptores, con nombres y zonas realistas de Villa El Salvador.
insert into negocios (nombre, tipo, zona, direccion) values
  ('Panadería San José', 'panadería', 'Villa El Salvador', 'Av. Pachacútec 450'),
  ('Restaurante El Fogón', 'restaurante', 'Villa El Salvador', 'Jr. Las Begonias 220'),
  ('Restaurante Sabor Criollo', 'restaurante', 'Villa El Salvador', 'Av. María Reiche 310'),
  ('Pollería Doña Rosa', 'restaurante', 'Villa El Salvador', 'Av. Revolución 180'),
  ('Bodega La Esquina', 'bodega', 'Villa El Salvador', 'Jr. Los Incas 95'),
  ('Café Cultural VES', 'restaurante', 'Villa El Salvador', 'Av. El Sol 540');

insert into comedores (nombre, tipo, zona, responsable) values
  ('Olla Virgen de Chapi', 'olla común', 'Villa El Salvador', 'María Quispe'),
  ('Olla Manos Unidas', 'olla común', 'Villa El Salvador', 'Rosa Huamán'),
  ('Comedor Popular Las Flores', 'comedor popular', 'Villa El Salvador', 'Juana Mamani'),
  ('Olla Común San Genaro', 'olla común', 'Villa El Salvador', 'Elena Torres'),
  ('Comedor Popular Virgen del Carmen', 'comedor popular', 'Villa El Salvador', 'Carmen Ríos'),
  ('Olla Nueva Esperanza', 'olla común', 'Villa El Salvador', 'Flor Sánchez');


-- 6) Función RPC: publica un excedente con varios productos,
--    de forma atómica (RN01 a RN04).

create or replace function publicar_excedente(
  p_negocio_id bigint,
  p_hora_limite timestamptz,
  p_items jsonb
)
returns bigint
language plpgsql
as $$
declare
  v_publicacion_id bigint;
  v_item      jsonb;
  v_producto  text;
  v_cantidad  integer;
  v_unidad    text;
begin
  if p_negocio_id is null then
    raise exception 'El negocio es obligatorio';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La publicación debe tener al menos un producto';
  end if;

  if p_hora_limite is null or p_hora_limite <= now() then
    raise exception 'La hora límite debe ser posterior al momento de registro';
  end if;

  insert into publicaciones (negocio_id, hora_limite)
    values (p_negocio_id, p_hora_limite)
    returning id into v_publicacion_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_producto := v_item->>'producto';
    v_cantidad := (v_item->>'cantidad')::integer;
    v_unidad   := coalesce(v_item->>'unidad', 'unidad');

    if v_producto is null or trim(v_producto) = '' then
      raise exception 'El producto es obligatorio';
    end if;
    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'La cantidad debe ser mayor a 0';
    end if;

    insert into publicacion_detalle (publicacion_id, producto, cantidad, unidad)
      values (v_publicacion_id, v_producto, v_cantidad, v_unidad);
  end loop;

  return v_publicacion_id;
end;
$$;

-- 7) Función RPC: reclama una publicación mediante una
--    actualización condicional (RN05 a RN07). La propia cláusula
--    WHERE es la que decide si el reclamo es válido: solo afecta
--    una fila si sigue "disponible" y la hora límite no pasó. Si
--    no afecta ninguna fila, se diagnostica el motivo exacto para
--    devolver el mensaje correcto.

create or replace function reclamar_publicacion(
  p_publicacion_id bigint,
  p_comedor_id bigint
)
returns void
language plpgsql
as $$
declare
  v_filas integer;
  v_estado text;
  v_hora_limite timestamptz;
begin
  update publicaciones
    set estado = 'reclamada',
        comedor_id = p_comedor_id,
        fecha_reclamo = now()
    where id = p_publicacion_id
      and estado = 'disponible'
      and hora_limite >= now();

  get diagnostics v_filas = row_count;

  if v_filas = 1 then
    return;
  end if;

  -- La actualización no afectó ninguna fila: se determina el motivo.
  select estado, hora_limite into v_estado, v_hora_limite
    from publicaciones where id = p_publicacion_id;

  if v_estado is null then
    raise exception 'La publicación no existe';
  end if;

  if v_estado = 'reclamada' then
    raise exception 'Otro comedor ya reclamó esta publicación';
  end if;

  -- Si llegó aquí estando "disponible", fue porque venció justo ahora.
  if v_estado = 'disponible' and v_hora_limite < now() then
    update publicaciones set estado = 'vencida' where id = p_publicacion_id;
  end if;

  raise exception 'Esta publicación venció antes de que pudieras reclamarla';
end;
$$;

-- 8) RLS activado (solo el servidor, con la clave service_role,
--    podrá leer/escribir). Esto es opcional, pero recomendable 
alter table negocios enable row level security;
alter table comedores enable row level security;
alter table publicaciones enable row level security;
alter table publicacion_detalle enable row level security;