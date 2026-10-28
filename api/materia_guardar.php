<?php
/* =========================================================
   GUARDAR UNA MATERIA
   Qué hace: Agrega, cambia el nombre o borra una materia del colegio.
   Por qué: Es lo que usa el administrador para manejar la lista de materias; todo se revisa aquí, en el servidor.
   ========================================================= */

/* ---------- Solo POST y solo administrador ----------
   Qué hace: Carga las herramientas, rechaza otros tipos de petición y a cualquiera que no sea administrador.
   Por qué: Nadie más debe poder cambiar las materias. */
require __DIR__ . '/util.php';
solo_post();
exigir_admin();

/* ---------- Leer lo que mandó la página ----------
   Qué hace: Toma la acción pedida, el nombre actual de la materia (para editar o borrar) y el nombre nuevo.
   Por qué: Un solo archivo maneja las tres acciones. */
$d = entrada();
$accion = (string)($d['accion'] ?? '');
$actual = trim((string)($d['actual'] ?? ''));
$nombre = trim((string)($d['nombre'] ?? ''));

/* ---------- Revisar la acción y el nombre ----------
   Qué hace: Comprueba que la acción sea agregar, editar o borrar, y que el nombre tenga entre 2 y 60 letras (al borrar no hace falta nombre nuevo).
   Por qué: Protege contra peticiones raras y contra nombres vacíos o enormes. */
if ($accion !== 'agregar' && $accion !== 'editar' && $accion !== 'borrar') {
    fallar('Acción no válida.');
}
if ($accion !== 'borrar' && (largo($nombre) < 2 || largo($nombre) > 60)) {
    fallar('El nombre de la materia debe tener entre 2 y 60 letras.');
}

/* ---------- Preparar la consulta ----------
   Qué hace: Según la acción, prepara el INSERT, el UPDATE o el DELETE con los datos como parámetros.
   Por qué: Usar parámetros evita que un nombre malicioso se cuele dentro de la consulta. */
if ($accion === 'agregar') {
    $s = $conexion->prepare('INSERT INTO materias (mat_nombre) VALUES (?)');
    $s->bind_param('s', $nombre);
} elseif ($accion === 'editar') {
    $s = $conexion->prepare('UPDATE materias SET mat_nombre = ? WHERE mat_nombre = ?');
    $s->bind_param('ss', $nombre, $actual);
} else {
    $s = $conexion->prepare('DELETE FROM materias WHERE mat_nombre = ?');
    $s->bind_param('s', $actual);
}

/* ---------- Ejecutar y explicar los errores ----------
   Qué hace: Ejecuta la consulta. Si falla, distingue dos casos conocidos: materia repetida (error 1062) y materia que todavía se usa en profesores, horarios o actividades (error 1451).
   Por qué: Así la persona recibe un mensaje claro en vez de un error técnico. */
if (!$s->execute()) {
    $errno = $conexion->errno;
    if ($errno === 1062) {
        fallar('Esa materia ya existe.', 409);
    }
    if ($errno === 1451) {
        fallar('No se puede borrar: hay profesores, horarios o actividades que usan esta materia.', 409);
    }
    fallar('No se pudo guardar la materia.', 500);
}

/* ---------- Responder ----------
   Qué hace: Avisa que todo salió bien. */
responder(['ok' => true]);