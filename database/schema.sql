-- 1) Negocios donantes
create table if not exists negocios (
  id         bigint generated always as identity primary key,
  nombre     text not null,
  zona       text not null,
  created_at timestamptz not null default now()
);

-- 2) Comedores / ollas comunes receptores
create table if not exists comedores (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  zona        text not null,
  responsable text not null,
  created_at  timestamptz not null default now()
);

-- 3) Publicaciones de excedentes (cabecera)
create table if not exists publicaciones (
  id          bigint generated always as identity primary key,
  negocio_id  bigint not null references negocios(id),
  hora_limite timestamptz not null,
  estado      text not null default 'disponible'
              check (estado in ('disponible','reclamada','entregada')),
  created_at  timestamptz not null default now()
);

-- 4) Detalle de cada publicación (los productos donados)
create table if not exists publicacion_detalle (
  id              bigint generated always as identity primary key,
  publicacion_id  bigint not null references publicaciones(id) on delete cascade,
  producto        text not null,
  cantidad        integer not null check (cantidad > 0),
  unidad          text not null default 'unidad'
);

-- 5) Reclamos: qué comedor reclamó qué publicación
create table if not exists reclamos (
  id              bigint generated always as identity primary key,
  publicacion_id  bigint not null unique references publicaciones(id),
  comedor_id      bigint not null references comedores(id),
  fecha           timestamptz not null default now()
);

-- 6) Datos de ejemplo
insert into negocios (nombre, zona) values
  ('Panadería San José', 'Villa El Salvador'),
  ('Restaurante El Fogón', 'Villa El Salvador')
on conflict do nothing;

insert into comedores (nombre, zona, responsable) values
  ('Olla Virgen de Chapi', 'Villa El Salvador', 'María Quispe'),
  ('Olla Manos Unidas', 'Villa El Salvador', 'Rosa Huamán')
on conflict do nothing;


-- 7) Función RPC: publica un excedente con varios productos,

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
  v_item jsonb;
  v_producto text;
  v_cantidad integer;
  v_unidad text;
begin
  if p_negocio_id is null then
    raise exception 'El negocio es obligatorio';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La publicación debe tener al menos un producto';
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

-- 8) Función RPC: reclama una publicación. Solo puede reclamarse

create or replace function reclamar_publicacion(
  p_publicacion_id bigint,
  p_comedor_id bigint
)
returns void
language plpgsql
as $$
declare
  v_estado text;
begin
  select estado into v_estado
    from publicaciones where id = p_publicacion_id
    for update;

  if v_estado is null then
    raise exception 'La publicación no existe';
  end if;

  if v_estado <> 'disponible' then
    raise exception 'Esta publicación ya fue reclamada';
  end if;

  update publicaciones set estado = 'reclamada' where id = p_publicacion_id;

  insert into reclamos (publicacion_id, comedor_id)
    values (p_publicacion_id, p_comedor_id);
end;
$$;

-- 9) RLS activado (solo el servidor, con la clave service_role,
--    podrá leer/escribir).

alter table negocios enable row level security;
alter table comedores enable row level security;
alter table publicaciones enable row level security;
alter table publicacion_detalle enable row level security;
alter table reclamos enable row level security;