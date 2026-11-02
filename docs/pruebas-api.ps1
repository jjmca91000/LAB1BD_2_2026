# pruebas de la API: usar con la base recien creada (docker compose down -v y luego up)
$api = 'http://localhost:3000/api'
$script:pasan = 0
$script:fallan = 0

# se inicia sesion y se devuelve el token
function Login($correo, $password) {
  $body = @{ correo = $correo; password = $password } | ConvertTo-Json
  (Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType 'application/json' -Body $body).token
}

# se hace una peticion y se compara el codigo HTTP con el esperado
function Probar($titulo, $esperado, $method, $path, $token, $body, $crudo) {
  $params = @{ Method = $method; Uri = "$api$path"; ContentType = 'application/json; charset=utf-8'; UseBasicParsing = $true }
  if ($token) { $params.Headers = @{ Authorization = "Bearer $token" } }
  if ($crudo) { $params.Body = $crudo }
  elseif ($body) { $params.Body = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json)) }
  try {
    $r = Invoke-WebRequest @params
    $status = $r.StatusCode
    $texto = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    $texto = $_.ErrorDetails.Message
  }
  if ($status -eq $esperado) { $marca = 'PASA'; $script:pasan++ } else { $marca = 'FALLA'; $script:fallan++ }
  if ($texto -and $texto.Length -gt 110) { $texto = $texto.Substring(0, 110) + '...' }
  Write-Host "[$marca] $titulo (esperado $esperado, obtenido $status) $texto"
}

$admin = Login 'admin@redvet.cl' 'admin123'
$vet = Login 'vet.norte@redvet.cl' 'vet123'
$carlos = Login 'carlos.m@gmail.com' 'tutor123'

Write-Host '--- Seguridad (RBAC)'
Probar 'Sin token' 401 GET '/mascotas' $null
Probar 'Tutor no puede crear especies' 403 POST '/especies' $carlos @{ nombre = 'Reptil' }
Probar 'Tutor ve solo sus mascotas' 200 GET '/mascotas' $carlos
Probar 'Tutor no ve una mascota ajena' 404 GET '/mascotas/3' $carlos
Probar 'Tutor no agenda para una mascota ajena' 404 POST '/citas' $carlos @{ id_mascota = 3; id_sede = 1; id_veterinario = 1; tipo_atencion = 'Sede'; fecha_hora = '2026-12-01T10:00' }
Probar 'Tutor agenda para su mascota' 201 POST '/citas' $carlos @{ id_mascota = 1; id_sede = 1; id_veterinario = 1; tipo_atencion = 'Sede'; fecha_hora = '2026-12-01T10:00' }
Probar 'Tutor no registra atenciones' 403 POST '/atenciones' $carlos @{ id_cita = 17; diagnostico = 'x'; tratamiento = 'y' }

Write-Host '--- Procedimiento 1 y trigger de alergias'
Probar 'Receta con alergia (Firulais + Meloxicam)' 400 POST '/atenciones' $vet @{ id_cita = 17; diagnostico = 'Control'; tratamiento = 'Reposo'; medicamentos = @(1); cantidades = @(1) }
Probar 'Sin stock suficiente' 400 POST '/atenciones' $vet @{ id_cita = 17; diagnostico = 'Control'; tratamiento = 'Reposo'; medicamentos = @(2); cantidades = @(999) }
Probar 'Atencion sin medicamentos + primera dosis Octuple' 201 POST '/atenciones' $vet @{ id_cita = 17; diagnostico = 'Control sano'; tratamiento = 'Vacunacion'; id_vacuna = 2 }
Probar 'Misma cita otra vez (ficha ya cerrada)' 400 POST '/atenciones' $vet @{ id_cita = 17; diagnostico = 'x'; tratamiento = 'y' }

Write-Host '--- Procedimiento 2'
Probar 'Plan de perro a una gata' 400 POST '/vacunaciones' $admin @{ id_cita = 18; id_vacuna = 2 }
Probar 'Plan inexistente' 400 POST '/vacunaciones' $admin @{ id_cita = 18; id_vacuna = 99 }
Probar 'Cita inexistente' 404 POST '/vacunaciones' $vet @{ id_cita = 999; id_vacuna = 3 }
Probar 'Triple Felina a Luna (agenda 1 refuerzo)' 201 POST '/vacunaciones' $admin @{ id_cita = 18; id_vacuna = 3 }
Probar 'Rex refuerzo 1 en cita 19, con receta' 201 POST '/atenciones' $vet @{ id_cita = 19; diagnostico = 'Refuerzo'; tratamiento = 'Vacunacion'; medicamentos = @(3); cantidades = @(1); id_vacuna = 2 }
Probar 'Rex refuerzo 2 en cita 21' 201 POST '/atenciones' $vet @{ id_cita = 21; diagnostico = 'Refuerzo final'; tratamiento = 'Vacunacion'; id_vacuna = 2 }
Probar 'Rex ya completo la Octuple' 400 POST '/vacunaciones' $vet @{ id_cita = 21; id_vacuna = 2 }

Write-Host '--- Fichas y auditoria (trigger 2)'
Probar 'Corregir ficha cerrada' 200 PATCH '/fichas/16' $vet @{ diagnostico = 'Control sano (corregido)'; tratamiento = 'Vacunacion' }
Probar 'Corregir ficha abierta (se atiende, no se corrige)' 404 PATCH '/fichas/1000' $vet @{ diagnostico = 'x'; tratamiento = 'y' }
Probar 'Auditoria' 200 GET '/auditoria' $admin

Write-Host '--- Endpoints especiales'
Probar 'Por vencer (tutor ve solo las suyas)' 200 GET '/vacunaciones/por-vencer' $carlos
Probar 'Disponibilidad' 200 GET '/veterinarios/1/disponibilidad?fecha=2026-11-05' $carlos
Probar 'Disponibilidad con fecha imposible' 400 GET '/veterinarios/1/disponibilidad?fecha=2026-02-30' $admin
Probar 'Refrescar estadisticas' 200 POST '/estadisticas/refrescar' $admin
Probar 'Estadisticas filtradas por sede y especie' 200 GET '/estadisticas?id_sede=3&id_especie=5' $admin
Probar 'Estadisticas con filtro invalido' 400 GET '/estadisticas?id_sede=abc' $admin
Probar 'Tutor no ve estadisticas' 403 GET '/estadisticas' $carlos

Write-Host '--- Registro de usuario'
Probar 'Registro de tutor (devuelve token)' 201 POST '/auth/registro' $null @{ nombre = 'Marta Rios'; correo = 'marta@gmail.com'; password = 'marta123' }
Probar 'Registro con correo repetido' 409 POST '/auth/registro' $null @{ nombre = 'Otra'; correo = 'marta@gmail.com'; password = 'otra123' }
Probar 'Registro sin contrasena' 400 POST '/auth/registro' $null @{ nombre = 'Otra'; correo = 'otra@gmail.com' }
Probar 'Login con contrasena mala' 401 POST '/auth/login' $null @{ correo = 'marta@gmail.com'; password = 'mala' }

Write-Host '--- Paginacion y consultas por id'
Probar 'Mascotas pagina 1 de 3' 200 GET '/mascotas?pagina=1&limite=3' $admin
Probar 'Mascotas pagina 4 de 3 (solo queda 1)' 200 GET '/mascotas?pagina=4&limite=3' $admin
Probar 'Limite invalido' 400 GET '/mascotas?limite=abc' $admin
Probar 'Rol por id' 200 GET '/roles/3' $admin
Probar 'Especie por id' 200 GET '/especies/1' $carlos
Probar 'Sede por id' 200 GET '/sedes/1' $carlos
Probar 'Medicamento por id' 200 GET '/medicamentos/1' $vet
Probar 'Inventario por id' 200 GET '/inventario/1' $vet
Probar 'Tutor por id' 200 GET '/tutores/1' $vet
Probar 'Veterinario por id' 200 GET '/veterinarios/1' $carlos
Probar 'Administrador por id' 200 GET '/administradores/1' $admin
Probar 'Cita por id (propia del tutor)' 200 GET '/citas/17' $carlos
Probar 'Cita ajena (tutor)' 404 GET '/citas/19' $carlos
Probar 'Ficha por id' 200 GET '/fichas/16' $carlos
Probar 'Receta por id' 200 GET '/recetas/1' $vet
Probar 'Recetas (lista)' 200 GET '/recetas' $admin
Probar 'Auditoria por id' 200 GET '/auditoria/1' $admin
Probar 'Alergias filtradas por mascota' 200 GET '/alergias?id_mascota=1' $vet
Probar 'Alergia por id' 200 GET '/alergias/1' $vet
Probar 'Plan por id' 200 GET '/planes-vacunacion/2' $vet
Probar 'Tutor no ve los planes' 403 GET '/planes-vacunacion' $carlos
Probar 'Registro de vacuna por id' 200 GET '/vacunaciones/7' $carlos
Probar 'Especie inexistente' 404 GET '/especies/999' $admin

Write-Host '--- CRUD'
Probar 'Crear especie' 201 POST '/especies' $admin @{ nombre = 'Reptil' }
Probar 'Especie repetida' 409 POST '/especies' $admin @{ nombre = 'Reptil' }
Probar 'Editar especie' 200 PATCH '/especies/6' $admin @{ nombre = 'Reptiles' }
Probar 'Borrar especie' 204 DELETE '/especies/6' $admin
Probar 'Borrar especie usada por mascotas' 409 DELETE '/especies/1' $admin
Probar 'Crear tutor (usuario + perfil)' 201 POST '/tutores' $admin @{ correo = 'nuevo@gmail.com'; password = 'clave123'; nombre = 'Tutor Nuevo' }
Probar 'Login del tutor nuevo' 200 POST '/auth/login' $null @{ correo = 'nuevo@gmail.com'; password = 'clave123' }
Probar 'Editar tutor' 200 PATCH '/tutores/9' $admin @{ nombre = 'Tutor Editado' }
Probar 'Borrar tutor (y su usuario)' 204 DELETE '/tutores/9' $admin
Probar 'Crear veterinario' 201 POST '/veterinarios' $admin @{ correo = 'vet.nuevo@redvet.cl'; password = 'vet123'; nombre = 'Dr. Nuevo'; id_sede = 2 }
Probar 'Editar veterinario' 200 PATCH '/veterinarios/4' $admin @{ nombre = 'Dr. Nuevo'; id_sede = 3 }
Probar 'Borrar veterinario' 204 DELETE '/veterinarios/4' $admin
Probar 'Crear administrador' 201 POST '/administradores' $admin @{ correo = 'admin2@redvet.cl'; password = 'admin456'; nombre = 'Admin Dos' }
Probar 'Editar administrador' 200 PATCH '/administradores/2' $admin @{ nombre = 'Admin Segundo' }
Probar 'Borrar administrador' 204 DELETE '/administradores/2' $admin
Probar 'No se borra el ultimo administrador' 404 DELETE '/administradores/1' $admin
Probar 'Crear medicamento' 201 POST '/medicamentos' $admin @{ nombre_comercial = 'Prueba 10mg'; principio_activo = 'Prueba' }
Probar 'Editar medicamento' 200 PATCH '/medicamentos/6' $admin @{ nombre_comercial = 'Prueba 20mg'; principio_activo = 'Prueba' }
Probar 'Agregar al inventario' 200 POST '/inventario' $admin @{ id_sede = 1; id_medicamento = 6; stock_actual = 10 }
Probar 'Borrar del inventario' 204 DELETE '/inventario/16' $admin
Probar 'Borrar medicamento' 204 DELETE '/medicamentos/6' $admin
Probar 'Crear mascota (tutor)' 201 POST '/mascotas' $carlos @{ nombre = 'Toby'; id_especie = 1 }
Probar 'Editar mascota (tutor)' 200 PATCH '/mascotas/11' $carlos @{ nombre = 'Toby II'; id_especie = 1 }
Probar 'Crear alergia' 201 POST '/alergias' $vet @{ id_mascota = 11; principio_activo = 'Tramadol' }
Probar 'Editar alergia' 200 PATCH '/alergias/4' $vet @{ principio_activo = 'Cefalexina' }
Probar 'Borrar alergia' 204 DELETE '/alergias/4' $vet
Probar 'Borrar mascota' 204 DELETE '/mascotas/11' $admin
Probar 'Borrar mascota con historial' 409 DELETE '/mascotas/1' $admin
Probar 'Crear plan' 201 POST '/planes-vacunacion' $admin @{ id_especie = 4; nombre_vacuna = 'Prueba roedor'; cantidad_refuerzo = 1; dias_refuerzo = 10 }
Probar 'Plan con dias negativos' 400 POST '/planes-vacunacion' $admin @{ id_especie = 4; nombre_vacuna = 'Mala'; cantidad_refuerzo = 1; dias_refuerzo = -5 }
Probar 'Editar plan' 200 PATCH '/planes-vacunacion/5' $admin @{ id_especie = 4; nombre_vacuna = 'Prueba roedor'; cantidad_refuerzo = 2; dias_refuerzo = 10 }
Probar 'Borrar plan' 204 DELETE '/planes-vacunacion/5' $admin
Probar 'Reprogramar cita' 200 PATCH '/citas/16' $admin @{ id_sede = 3; id_veterinario = 3; tipo_atencion = 'Domicilio'; fecha_hora = '2026-11-04T17:00' }
Probar 'Tipo de atencion invalido' 400 PATCH '/citas/16' $admin @{ id_sede = 3; id_veterinario = 3; tipo_atencion = 'Online'; fecha_hora = '2026-11-04T17:00' }
Probar 'Cancelar cita' 200 PATCH '/citas/16/cancelar' $admin
Probar 'Cancelar la misma cita otra vez' 404 PATCH '/citas/16/cancelar' $admin
Probar 'Borrar cita atendida' 409 DELETE '/citas/17' $admin
Probar 'Borrar cita programada (con su ficha)' 204 DELETE '/citas/22' $admin
Probar 'Id con letras' 400 GET '/mascotas/abc' $admin
Probar 'Borrar registro de vacuna' 204 DELETE '/vacunaciones/1' $admin

Write-Host '--- Tipos de datos'
Probar 'Id booleano (true)' 400 POST '/citas' $carlos @{ id_mascota = $true; id_sede = 1; id_veterinario = 1; tipo_atencion = 'Sede'; fecha_hora = '2026-12-20T10:00' }
Probar 'Id con decimales' 400 GET '/mascotas/1.5' $admin
Probar 'Id negativo' 400 GET '/mascotas/-1' $admin
Probar 'Id fuera de rango' 400 GET '/mascotas/99999999999' $admin
Probar 'Stock vacio' 400 POST '/inventario' $admin @{ id_sede = 1; id_medicamento = 1; stock_actual = '' }
Probar 'Stock null' 400 POST '/inventario' $admin @{ id_sede = 1; id_medicamento = 1; stock_actual = $null }
Probar 'Stock negativo' 400 POST '/inventario' $admin @{ id_sede = 1; id_medicamento = 1; stock_actual = -3 }
Probar 'Stock como texto con un numero' 200 POST '/inventario' $admin @{ id_sede = 1; id_medicamento = 1; stock_actual = '7' }
Probar 'Nombre numerico' 400 POST '/especies' $admin @{ nombre = 123 }
Probar 'Nombre solo con espacios' 400 POST '/especies' $admin @{ nombre = '   ' }
Probar 'Nombre de 300 letras' 400 POST '/especies' $admin @{ nombre = ('x' * 300) }
Probar 'Texto con comillas (inyeccion SQL)' 201 POST '/especies' $admin @{ nombre = "Gato'); DROP TABLE ""MASCOTA""; --" }
Probar 'La tabla MASCOTA sigue existiendo' 200 GET '/mascotas' $admin
Probar 'JSON roto' 400 POST '/especies' $admin $null '{"nombre": '
Probar 'Ruta inexistente' 404 GET '/no-existe' $admin
Probar 'Fecha que no es fecha' 400 POST '/citas' $carlos @{ id_mascota = 1; id_sede = 1; id_veterinario = 1; tipo_atencion = 'Sede'; fecha_hora = 'hola' }
Probar 'Pagina 0' 400 GET '/mascotas?pagina=0&limite=5' $admin

Write-Host '--- Cuentas'
Probar 'Correo sin formato' 400 POST '/auth/registro' $null @{ nombre = 'Hola'; correo = 'hola'; password = 'clave123' }
Probar 'Contrasena corta' 400 POST '/auth/registro' $null @{ nombre = 'Hola'; correo = 'hola@gmail.com'; password = 'abc' }
Probar 'Mismo correo en mayusculas' 409 POST '/auth/registro' $null @{ nombre = 'Marta'; correo = 'MARTA@GMAIL.COM'; password = 'clave123' }
Probar 'Login sin importar mayusculas' 200 POST '/auth/login' $null @{ correo = 'Marta@Gmail.com'; password = 'marta123' }
Probar 'Dos tutores con el mismo nombre' 201 POST '/auth/registro' $null @{ nombre = 'Marta Rios'; correo = 'marta2@gmail.com'; password = 'clave123' }
Probar 'Token alterado' 401 GET '/mascotas' "$($carlos)x"
Probar 'Tutor no crea veterinarios' 403 POST '/veterinarios' $carlos @{ correo = 'x@redvet.cl'; password = 'clave123'; nombre = 'X'; id_sede = 1 }
Probar 'Veterinario no crea administradores' 403 POST '/administradores' $vet @{ correo = 'x@redvet.cl'; password = 'clave123'; nombre = 'X' }
Probar 'Admin crea la cuenta de un veterinario' 201 POST '/veterinarios' $admin @{ correo = 'dra.nueva@redvet.cl'; password = 'clave123'; nombre = 'Dra. Nueva'; id_sede = 1 }
$vetNueva = Login 'dra.nueva@redvet.cl' 'clave123'
Probar 'El veterinario nuevo ingresa y ve su agenda' 200 GET '/citas' $vetNueva

Write-Host '--- Reglas entre cuentas'
$lucia = Login 'lucia.f@gmail.com' '123456'
$vet2 = Login 'vet.centro@redvet.cl' '123456'
Probar 'Tutora 2 ve su propia mascota' 200 GET '/mascotas/3' $lucia
Probar 'Tutora 2 no ve la mascota de Carlos' 404 GET '/mascotas/1' $lucia
Probar 'Tutora 2 no edita la mascota de Carlos' 404 PATCH '/mascotas/1' $lucia @{ nombre = 'Robado'; id_especie = 1 }
Probar 'Tutora 2 no ve la ficha de Carlos' 404 GET '/fichas/16' $lucia
Probar 'Tutora 2 no ve la vacuna de Carlos' 404 GET '/vacunaciones/7' $lucia
Probar 'Tutora 2 no ve la alergia de Firulais' 404 GET '/alergias/1' $lucia
Probar 'Veterinario 2 ve su agenda' 200 GET '/citas' $vet2
Probar 'Veterinario 2 no ve la cita del veterinario 1' 404 GET '/citas/23' $vet2
Probar 'Veterinario 2 no atiende la cita del veterinario 1' 404 POST '/atenciones' $vet2 @{ id_cita = 23; diagnostico = 'x'; tratamiento = 'y' }
Probar 'Veterinario 2 no cancela la cita del veterinario 1' 404 PATCH '/citas/23/cancelar' $vet2
Probar 'Veterinario 2 no vacuna en la cita del veterinario 1' 404 POST '/vacunaciones' $vet2 @{ id_cita = 23; id_vacuna = 2 }
Probar 'Veterinario 2 no corrige una ficha del veterinario 1' 404 PATCH '/fichas/16' $vet2 @{ diagnostico = 'x'; tratamiento = 'y' }
Probar 'Veterinario 1 atiende su cita de refuerzo' 201 POST '/atenciones' $vet @{ id_cita = 23; diagnostico = 'Refuerzo 1'; tratamiento = 'Vacunacion'; id_vacuna = 2 }

Write-Host '--- Reglas de citas y vacunas'
Probar 'Cita en una hora ocupada' 409 POST '/citas' $carlos @{ id_mascota = 1; id_sede = 1; id_veterinario = 1; tipo_atencion = 'Sede'; fecha_hora = '2027-01-04T10:30' }
Probar 'Reprogramar a una hora ocupada' 409 PATCH '/citas/25' $admin @{ id_sede = 1; id_veterinario = 1; tipo_atencion = 'Sede'; fecha_hora = '2027-01-04T10:00' }
Probar 'Veterinario de otra sede' 400 POST '/citas' $carlos @{ id_mascota = 1; id_sede = 2; id_veterinario = 1; tipo_atencion = 'Sede'; fecha_hora = '2026-12-21T10:00' }
Probar 'Reprogramar con un veterinario de otra sede' 400 PATCH '/citas/25' $admin @{ id_sede = 1; id_veterinario = 2; tipo_atencion = 'Sede'; fecha_hora = '2026-12-22T10:00' }
Probar 'Cita en el pasado' 400 POST '/citas' $carlos @{ id_mascota = 1; id_sede = 1; id_veterinario = 1; tipo_atencion = 'Sede'; fecha_hora = '2020-01-01T10:00' }
Probar 'Vacuna en una cita cancelada' 400 POST '/vacunaciones' $admin @{ id_cita = 20; id_vacuna = 3 }
Probar 'La misma vacuna dos veces en la misma cita' 400 POST '/vacunaciones' $admin @{ id_cita = 18; id_vacuna = 3 }

Write-Host ''
Write-Host "Resultado: $script:pasan pasan, $script:fallan fallan"
