// Confirmacion antes de acciones sensibles (resetear contraseña, generar
// contraseña temporal...). Se aisla en un composable para no repetir
// window.confirm por todos lados y poder cambiar la implementacion (ej. un
// modal propio) en un solo lugar el dia que se necesite.
export function useConfirm() {
  function confirmAction(message) {
    return window.confirm(message)
  }
  return { confirmAction }
}
