if (sessionStorage.getItem('ayni_rol') !== 'donante') {
  window.location.href = 'index.html';
}

let carrito = []; // [{ producto, cantidad, unidad }]

const selectNegocio = document.getElementById('select-negocio');
const formPublicacion = document.getElementById('form-publicacion');
const inputProducto = document.getElementById('input-producto');
const inputCantidad = document.getElementById('input-cantidad');
const selectUnidad = document.getElementById('select-unidad');
const listaCarrito = document.getElementById('lista-carrito');
const listaPublicaciones = document.getElementById('lista-publicaciones');
const mensajeError = document.getElementById('mensaje-error');
const errorNegocio = document.getElementById('error-negocio');
const errorHora = document.getElementById('error-hora');
const errorCarrito = document.getElementById('error-carrito');

function limpiarErroresDeCampo() {
  errorNegocio.textContent = '';
  errorHora.textContent = '';
  errorCarrito.textContent = '';
  mensajeError.textContent = '';
}

function estadoATexto(estado) {
  if (estado === 'disponible') return 'Disponible';
  if (estado === 'reclamada') return 'Reclamada';
  return 'Vencida';
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

  const res = await fetch(`/api/publicaciones/historial?negocio_id=${negocioId}`);
  const publicaciones = await res.json();

  listaPublicaciones.textContent = '';

  if (publicaciones.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'lista-publicaciones__vacio';
    vacio.textContent = 'Aún no publicaste ningún excedente.';
    listaPublicaciones.appendChild(vacio);
    return;
  }

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

    if (pub.estado === 'reclamada' && pub.comedores) {
      const nota = document.createElement('p');
      nota.className = 'publicacion__detalle';
      nota.textContent = `Reclamado por ${pub.comedores.nombre} el ${new Date(pub.fecha_reclamo).toLocaleString()}`;
      li.appendChild(nota);
    }

    listaPublicaciones.appendChild(li);
  });
}

function renderCarrito() {
  listaCarrito.textContent = '';

  if (carrito.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'lista-carrito__vacio';
    vacio.textContent = 'Todavía no agregaste productos.';
    listaCarrito.appendChild(vacio);
    return;
  }

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

const btnPublicar = formPublicacion.querySelector('button[type="submit"]');

formPublicacion.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarErroresDeCampo();

  const negocioId = Number(selectNegocio.value);
  const horaLimite = document.getElementById('hora-limite').value;
  let huboError = false;

  // Mensajes de validación junto a cada campo, antes de enviar el
  // formulario (RF04, RF05, RF11). La validación definitiva la repite
  // el servidor en publicar_excedente, según RNF05.
  if (!negocioId) {
    errorNegocio.textContent = 'Elige tu negocio primero';
    huboError = true;
  }
  if (!horaLimite) {
    errorHora.textContent = 'Indica hasta cuándo está disponible';
    huboError = true;
  } else if (new Date(horaLimite) <= new Date()) {
    errorHora.textContent = 'La hora límite debe ser posterior a este momento';
    huboError = true;
  }
  if (carrito.length === 0) {
    errorCarrito.textContent = 'Agrega al menos un producto';
    huboError = true;
  }

  if (huboError) return;

  const confirmado = await confirmarAccion(
    `¿Publicar este excedente con ${carrito.length} producto(s)?`
  );
  if (!confirmado) return;

  btnPublicar.disabled = true;
  btnPublicar.textContent = 'Publicando...';

  try {
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
  } finally {
    btnPublicar.disabled = false;
    btnPublicar.textContent = 'Publicar excedente';
  }
});

cargarNegocios();