document.querySelectorAll('.rol').forEach((boton) => {
  boton.addEventListener('click', () => {
    const rol = boton.dataset.rol; // "donante" o "receptor"
    sessionStorage.setItem('ayni_rol', rol);
    window.location.href = `${rol}.html`;
  });
});