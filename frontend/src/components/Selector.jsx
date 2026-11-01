// lista desplegable con una opcion por elemento; si es opcional se puede dejar en Ninguno
export default function Selector({ valor, opciones, texto, alCambiar, opcional = false }) {
  return (
    <select required={!opcional} value={valor} onChange={e => alCambiar(e.target.value)}>
      <option value="">{opcional ? 'Ninguno' : 'Selecciona…'}</option>
      {opciones.map(opcion => (
        <option key={opcion.id} value={opcion.id}>{texto(opcion)}</option>
      ))}
    </select>
  );
}
