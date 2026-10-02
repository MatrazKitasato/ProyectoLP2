let carrito = []; // [{ producto, cantidad, unidad }]

const selectNegocio = document.getElementById('select-negocio');
const formPublicacion = document.getElementById('form-publicacion');
const inputProducto = document.getElementById('input-producto');
const inputCantidad = document.getElementById('input-cantidad');
const selectUnidad = document.getElementById('select-unidad');
const listaCarrito = document.getElementById('lista-carrito');
const listaPublicaciones = document.getElementById('lista-publicaciones');
const mensajeError = document.getElementById('mensaje-error');

function estadoATexto(estado) {
  if (estado === 'disponible') return 'Disponible';
  if (estado === 'reclamada') return 'Reclamada';
  return 'Entregada';
}

async function cargarNegocios() {
  const res = await fetch('/api/negocios');
  const negocios = await res.json();

  selectNegocio.textContent = '';
  negocios.forEach((n) => {
    const opcion = document.createElement('option');
    opcion.value = n.id;
    opcion.textContent = `${n.nombre} (${n.zona})`;
    selectNegocio.appendChild(opcion);
  });

  // Recuerda el negocio elegido anteriormente en esta misma sesión
  const guardado = sessionStorage.getItem('ayni_negocio_id');
  if (guardado && negocios.some((n) => String(n.id) === guardado)) {
    selectNegocio.value = guardado;
  }

  await cargarPublicaciones();
}

async function cargarPublicaciones() {
  const negocioId = selectNegocio.value;
  if (!negocioId) return;

  sessionStorage.setItem('ayni_negocio_id', negocioId);

  const res = await fetch(`/api/publicaciones?negocio_id=${negocioId}`);
  const publicaciones = await res.json();

  listaPublicaciones.textContent = '';

  publicaciones.forEach((pub) => {
    const li = document.createElement('li');
    li.className = 'publicacion';

    const cabecera = document.createElement('div');
    cabecera.className = 'publicacion__cabecera';

    const fecha = document.createElement('span');
    fecha.textContent = `Hasta ${new Date(pub.hora_limite).toLocaleString()}`;

    const estado = document.createElement('span');
    estado.className = `estado estado--${pub.estado}`;
    estado.textContent = estadoATexto(pub.estado);

    cabecera.appendChild(fecha);
    cabecera.appendChild(estado);
    li.appendChild(cabecera);

    const detalle = document.createElement('ul');
    detalle.className = 'publicacion__detalle';
    (pub.publicacion_detalle || []).forEach((d) => {
      const item = document.createElement('li');
      item.textContent = `${d.producto}: ${d.cantidad} ${d.unidad}`;
      detalle.appendChild(item);
    });
    li.appendChild(detalle);

    if (pub.reclamos && pub.reclamos.length > 0) {
      const reclamo = pub.reclamos[0];
      const nota = document.createElement('p');
      nota.className = 'publicacion__detalle';
      nota.textContent = `Reclamado por ${reclamo.comedores?.nombre ?? 'un comedor'}`;
      li.appendChild(nota);
    }

    listaPublicaciones.appendChild(li);
  });
}

function renderCarrito() {
  listaCarrito.textContent = '';
  carrito.forEach((item, indice) => {
    const li = document.createElement('li');
    li.textContent = `${item.producto}: ${item.cantidad} ${item.unidad} `;

    const btnQuitar = document.createElement('button');
    btnQuitar.type = 'button';
    btnQuitar.textContent = 'Quitar';
    btnQuitar.addEventListener('click', () => {
      carrito.splice(indice, 1);
      renderCarrito();
    });

    li.appendChild(btnQuitar);
    listaCarrito.appendChild(li);
  });
}

document.getElementById('btn-agregar').addEventListener('click', () => {
  const producto = inputProducto.value.trim();
  const cantidad = Number(inputCantidad.value);
  const unidad = selectUnidad.value;

  if (!producto || !cantidad || cantidad <= 0) return;

  carrito.push({ producto, cantidad, unidad });
  renderCarrito();
  inputProducto.value = '';
  inputCantidad.value = 1;
});

selectNegocio.addEventListener('change', cargarPublicaciones);

formPublicacion.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mensajeError.textContent = '';

  const negocioId = Number(selectNegocio.value);
  const horaLimite = document.getElementById('hora-limite').value;

  if (!negocioId) {
    mensajeError.textContent = 'Elige tu negocio primero';
    return;
  }
  if (!horaLimite) {
    mensajeError.textContent = 'Indica hasta cuándo está disponible';
    return;
  }
  if (carrito.length === 0) {
    mensajeError.textContent = 'Agrega al menos un producto';
    return;
  }

  const respuesta = await fetch('/api/publicaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      negocio_id: negocioId,
      hora_limite: new Date(horaLimite).toISOString(),
      items: carrito,
    }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    mensajeError.textContent = datos.error;
    return;
  }

  formPublicacion.reset();
  carrito = [];
  renderCarrito();
  await cargarPublicaciones();
});

cargarNegocios();