if (sessionStorage.getItem('ayni_rol') !== 'receptor') {
  window.location.href = 'index.html';
}

const selectComedor = document.getElementById('select-comedor');
const listaPublicaciones = document.getElementById('lista-publicaciones');
const mensajeError = document.getElementById('mensaje-error');
const errorComedor = document.getElementById('error-comedor');

async function cargarComedores() {
  const res = await fetch('/api/comedores');
  const comedores = await res.json();

  selectComedor.textContent = '';
  comedores.forEach((c) => {
    const opcion = document.createElement('option');
    opcion.value = c.id;
    opcion.textContent = `${c.nombre} (${c.zona})`;
    selectComedor.appendChild(opcion);
  });

  const guardado = sessionStorage.getItem('ayni_comedor_id');
  if (guardado && comedores.some((c) => String(c.id) === guardado)) {
    selectComedor.value = guardado;
  }
}

async function cargarDisponibles() {
  const res = await fetch('/api/publicaciones/disponibles');
  const disponibles = await res.json();

  listaPublicaciones.textContent = '';

  if (disponibles.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'lista-publicaciones__vacio';
    vacio.textContent = 'No hay excedentes disponibles por ahora. Vuelve a revisar más tarde 🙂';
    listaPublicaciones.appendChild(vacio);
    return;
  }

  disponibles.forEach((pub) => {
    const li = document.createElement('li');
    li.className = 'publicacion';

    const cabecera = document.createElement('div');
    cabecera.className = 'publicacion__cabecera';

    const negocio = document.createElement('span');
    negocio.className = 'publicacion__negocio';
    negocio.textContent = pub.negocios?.nombre ?? 'Negocio';

    const fecha = document.createElement('span');
    fecha.textContent = `Hasta ${new Date(pub.hora_limite).toLocaleString()}`;

    cabecera.appendChild(negocio);
    cabecera.appendChild(fecha);
    li.appendChild(cabecera);

    const detalle = document.createElement('ul');
    detalle.className = 'publicacion__detalle';
    (pub.publicacion_detalle || []).forEach((d) => {
      const item = document.createElement('li');
      item.textContent = `${d.producto}: ${d.cantidad} ${d.unidad}`;
      detalle.appendChild(item);
    });
    li.appendChild(detalle);

    const btnReclamar = document.createElement('button');
    btnReclamar.type = 'button';
    btnReclamar.className = 'boton boton--principal';
    btnReclamar.textContent = 'Reclamar';
    btnReclamar.addEventListener('click', () => reclamar(pub.id, btnReclamar));
    li.appendChild(btnReclamar);

    listaPublicaciones.appendChild(li);
  });
}

async function reclamar(publicacionId, boton) {
  mensajeError.textContent = '';
  errorComedor.textContent = '';
  const comedorId = Number(selectComedor.value);

  // Mensaje de validación junto al campo (RF10, RF11), antes de enviar.
  if (!comedorId) {
    errorComedor.textContent = 'Elige tu comedor primero';
    return;
  }

  const confirmado = await confirmarAccion('¿Reclamar este excedente para tu comedor?');
  if (!confirmado) return;

  boton.disabled = true;
  boton.textContent = 'Reclamando...';

  try {
    const respuesta = await fetch(`/api/publicaciones/${publicacionId}/reclamar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comedor_id: comedorId }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mensajeError.textContent = datos.error;
      return;
    }

    await cargarDisponibles();
  } finally {
    // Si la publicación ya no está en la lista (se reclamó con éxito),
    // el botón desapareció junto con ella; si sigue, se reactiva.
    if (document.body.contains(boton)) {
      boton.disabled = false;
      boton.textContent = 'Reclamar';
    }
  }
}

selectComedor.addEventListener('change', () => {
  sessionStorage.setItem('ayni_comedor_id', selectComedor.value);
  errorComedor.textContent = '';
});

cargarComedores();
cargarDisponibles();