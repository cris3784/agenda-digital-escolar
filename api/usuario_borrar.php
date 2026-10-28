<?php
/* =========================================================
   BORRAR UNA CUENTA
   Qué hace: Elimina la cuenta de un estudiante, profesor o acudiente, junto con su foto y los trabajos que entregó.
   Por qué: Es lo que usa el administrador para dar de baja una cuenta sin dejar archivos sueltos en el servidor.
   ========================================================= */

/* ---------- Solo POST y solo administrador ----------
   Qué hace: Carga las herramientas, rechaza otros tipos de petición y a cualquiera que no sea administrador.
   Por qué: Nadie más debe poder borrar cuentas. */
require __DIR__ . '/util.php';
solo_post();
exigir_admin();

/* ---------- Leer y revisar lo que mandó la página ----------
   Qué hace: Toma el rol y el código de la cuenta; solo acepta estudiante, profesor o acudiente.
   Por qué: Las cuentas de administrador no se pueden borrar desde aquí. */
$d = entrada();
$rol    = (string)($d['rol'] ?? '');
$codigo = (int)($d['codigo'] ?? 0);

if (($rol !== 'estudiante' && $rol !== 'profesor' && $rol !== 'acudiente') || $codigo < 1) {
    fallar('Cuenta no válida.');
}

/* ---------- Buscar la cuenta ----------
   Qué hace: Busca la tabla del rol y la foto de la cuenta; si ya no existe, responde 404.
   Por qué: Otra persona pudo haberla borrado antes. */
list($tabla, $p) = ROLES[$rol];

$f = filas($conexion, "SELECT {$p}_foto AS foto FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo]);
if (!$f) {
    fallar('Esa cuenta ya no existe.', 404);
}

/* ---------- Anotar los trabajos entregados ----------
   Qué hace: Si es un estudiante, guarda la lista de archivos de los trabajos que entregó, antes de borrar la cuenta.
   Por qué: La base de datos borra las filas, pero los archivos quedarían en el servidor. */
// Antes de borrar la cuenta, se anotan los trabajos que entregó (la base de datos borra las filas,
// pero los archivos quedarían en el servidor)
$rutas = [];
if ($rol === 'estudiante') {
    foreach (filas($conexion, 'SELECT ent_archivo_ruta AS r FROM entregas WHERE ent_est_estudiante = ?', 'i', [$codigo]) as $e) {
        if ($e['r'] !== '') {
            $rutas[] = $e['r'];
        }
    }
}

/* ---------- Borrar la cuenta ----------
   Qué hace: Elimina la fila de la cuenta en su tabla.
   Por qué: Es la acción principal; si falla, se avisa y no se borra nada más. */
if (!ejecutar($conexion, "DELETE FROM {$tabla} WHERE {$p}_codigo = ?", 'i', [$codigo])) {
    fallar('No se pudo eliminar la cuenta.', 500);
}

/* ---------- Borrar la foto de perfil ----------
   Qué hace: Si la cuenta tenía foto, borra el archivo del servidor.
   Por qué: Para no dejar fotos de cuentas que ya no existen. */
// Foto de perfil
if (!empty($f[0]['foto'])) {
    $archivo = dirname(__DIR__) . '/' . $f[0]['foto'];
    if (is_file($archivo)) {
        @unlink($archivo);
    }
}

/* ---------- Borrar los trabajos entregados ----------
   Qué hace: Borra cada archivo anotado, pero solo si de verdad está dentro de la carpeta uploads/trabajos.
   Por qué: Es una protección: nunca se debe borrar un archivo fuera de esa carpeta. */
// Trabajos entregados: solo se borra lo que esté dentro de uploads/trabajos
$base = realpath(dirname(__DIR__) . '/uploads/trabajos');
foreach ($rutas as $r) {
    $real = realpath(dirname(__DIR__) . '/' . $r);
    if ($base && $real && strpos($real, $base . DIRECTORY_SEPARATOR) === 0 && is_file($real)) {
        @unlink($real);
    }
}

/* ---------- Responder ----------
   Qué hace: Avisa que todo salió bien. */
responder(['ok' => true]);