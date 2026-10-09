// Ventana modal de confirmación (RF06, RF10). Se construye una sola vez
// y se reutiliza tanto para "Publicar" como para "Reclamar".

function construirModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.hidden = true;

  overlay.innerHTML = `
    <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-titulo">
      <p id="modal-titulo" class="modal__mensaje"></p>
      <div class="modal__acciones">
        <button type="button" class="boton boton--secundario" data-accion="cancelar">Cancelar</button>
        <button type="button" class="boton boton--principal" data-accion="confirmar">Confirmar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  return overlay;
}

const modalOverlay = construirModal();
const modalMensaje = modalOverlay.querySelector('.modal__mensaje');
const btnCancelar = modalOverlay.querySelector('[data-accion="cancelar"]');
const btnConfirmar = modalOverlay.querySelector('[data-accion="confirmar"]');

function confirmarAccion(mensaje) {
  modalMensaje.textContent = mensaje;
  modalOverlay.hidden = false;

  return new Promise((resolve) => {
    function cerrar(resultado) {
      modalOverlay.hidden = true;
      btnCancelar.removeEventListener('click', onCancelar);
      btnConfirmar.removeEventListener('click', onConfirmar);
      resolve(resultado);
    }
    function onCancelar() { cerrar(false); }
    function onConfirmar() { cerrar(true); }

    btnCancelar.addEventListener('click', onCancelar);
    btnConfirmar.addEventListener('click', onConfirmar);
  });
}