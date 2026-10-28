<?php
/* =========================================================
   GUARDAR EL HORARIO
   Qué hace: Agrega, cambia o quita una clase del horario de un grupo.
   Por qué: Es lo que usa el administrador desde la página Horario; todo se revisa aquí, en el servidor.
   ========================================================= */

// Agregar, cambiar o quitar una clase del horario. Solo el administrador.

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae actividades_lib.php, que a su vez carga util.php y tiene las funciones de permisos.
   Por qué: Para no repetir código. */
require __DIR__ . '/actividades_lib.php';

/* ---------- Solo POST y solo administrador ----------
   Qué hace: Rechaza otros tipos de petición y a cualquiera que no sea administrador.
   Por qué: Nadie más debe poder cambiar el horario. */
solo_post();
exigir_admin();

/* ---------- Leer lo que mandó la página ----------
   Qué hace: Toma los datos enviados y la acción pedida (agregar, editar o borrar).
   Por qué: Un solo archivo maneja las tres acciones. */
$d = entrada();
$accion = (string)($d['accion'] ?? '');

/* ---------- Revisar una hora ----------
   Qué hace: Acepta horas como 6:30 o 06:30 y las deja en formato 06:30:00; si no es válida, devuelve nada.
   Por qué: Evita guardar horas inventadas. */
function hora_valida($t) {
    $t = trim((string)$t);
    if (!preg_match('/^([01]?\d|2[0-3]):([0-5]\d)$/', $t, $m)) {
        return null;
    }
    return str_pad($m[1], 2, '0', STR_PAD_LEFT) . ':' . $m[2] . ':00';
}

/* ---------- Revisar el día ----------
   Qué hace: Acepta lunes a sábado, con o sin tilde y sin importar mayúsculas.
   Por qué: Para que "Miércoles" y "miercoles" valgan lo mismo. */
// Solo días de la semana (con o sin tilde, sin importar mayúsculas)
function dia_valido($dia) {
    $quitar = ['á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'Á' => 'a', 'É' => 'e', 'Í' => 'i', 'Ó' => 'o', 'Ú' => 'u'];
    $n = strtolower(strtr(trim($dia), $quitar));
    return in_array($n, ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'], true);
}

/* ---------- Buscar el profesor ----------
   Qué hace: Busca qué profesor dicta esa materia en ese grupo (o en todos los grupos).
   Por qué: Así cada clase queda ligada a su profesor sin que el administrador lo escoja. */
function profesor_de($conexion, $materia, $grupo) {
    $p = filas(
        $conexion,
        'SELECT asi_pro_profesor AS p FROM asignaciones WHERE asi_mat_materia = ? AND (asi_gru_grupo = ? OR asi_gru_grupo IS NULL) ORDER BY (asi_gru_grupo IS NULL), asi_pro_profesor LIMIT 1',
        'is',
        [$materia, $grupo]
    );
    return $p ? (int)$p[0]['p'] : null;
}

/* ---------- Revisar los datos de una clase ----------
   Qué hace: Comprueba que la materia exista, que la clase termine después de empezar y que el salón tenga máximo 20 letras.
   Por qué: Se usa igual al agregar que al editar. */
function datos_de_clase($conexion, $d) {
    $materia = trim((string)($d['materia'] ?? ''));
    $ini = hora_valida($d['inicio'] ?? '');
    $fin = hora_valida($d['fin'] ?? '');
    $salon = trim((string)($d['salon'] ?? ''));

    $m = filas($conexion, 'SELECT mat_codigo FROM materias WHERE mat_nombre = ? LIMIT 1', 's', [$materia]);
    if (!$m) {
        fallar('Esa materia no existe.');
    }
    if (!$ini || !$fin || $ini >= $fin) {
        fallar('La hora no es válida: la clase debe terminar después de empezar.');
    }
    if (largo($salon) > 20) {
        fallar('El salón puede tener máximo 20 letras.');
    }
    return [(int)$m[0]['mat_codigo'], $ini, $fin, $salon];
}

/* ---------- Agregar una clase ----------
   Qué hace: Revisa grupo, día y datos, y la guarda en la tabla horarios.
   Por qué: Antes de guardar se confirma que todo exista. */
if ($accion === 'agregar') {
    $grupo = trim((string)($d['grupo'] ?? ''));
    $dia = trim((string)($d['dia'] ?? ''));

    if (!filas($conexion, 'SELECT gru_codigo FROM grupos WHERE gru_codigo = ?', 's', [$grupo])) {
        fallar('Ese grupo no existe.');
    }
    if (!dia_valido($dia)) {
        fallar('El día no es válido.');
    }
    list($mat, $ini, $fin, $salon) = datos_de_clase($conexion, $d);

    if (!ejecutar(
        $conexion,
        'INSERT INTO horarios (hor_gru_grupo, hor_mat_materia, hor_pro_profesor, hor_dia, hor_inicio, hor_fin, hor_salon) VALUES (?, ?, ?, ?, ?, ?, ?)',
        'siissss',
        [$grupo, $mat, profesor_de($conexion, $mat, $grupo), $dia, $ini, $fin, $salon]
    )) {
        fallar('No se pudo guardar la clase.', 500);
    }
    responder(['ok' => true]);
}

/* ---------- Buscar la clase existente ----------
   Qué hace: Para editar o borrar, busca la clase por su código; si ya no existe, responde 404.
   Por qué: Otra persona pudo haberla borrado antes. */
$codigo = (int)($d['codigo'] ?? 0);
$actual = $codigo > 0 ? filas($conexion, 'SELECT hor_gru_grupo AS g, hor_mat_materia AS m, hor_pro_profesor AS p FROM horarios WHERE hor_codigo = ?', 'i', [$codigo]) : [];
if (!$actual) {
    fallar('Esa clase ya no existe.', 404);
}

/* ---------- Editar una clase ----------
   Qué hace: Cambia materia, hora y salón; si cambió la materia, busca el profesor que corresponde.
   Por qué: Si la materia sigue igual se conserva el mismo profesor. */
if ($accion === 'editar') {
    list($mat, $ini, $fin, $salon) = datos_de_clase($conexion, $d);
    // Si cambió la materia, se busca el profesor que la dicta en ese grupo; si no, se conserva
    $pro = $mat === (int)$actual[0]['m'] ? ($actual[0]['p'] !== null ? (int)$actual[0]['p'] : null) : profesor_de($conexion, $mat, $actual[0]['g']);

    if (!ejecutar(
        $conexion,
        'UPDATE horarios SET hor_mat_materia = ?, hor_pro_profesor = ?, hor_inicio = ?, hor_fin = ?, hor_salon = ? WHERE hor_codigo = ?',
        'iisssi',
        [$mat, $pro, $ini, $fin, $salon, $codigo]
    )) {
        fallar('No se pudo guardar la clase.', 500);
    }
    responder(['ok' => true]);
}

/* ---------- Borrar una clase ----------
   Qué hace: La elimina de la tabla horarios. */
if ($accion === 'borrar') {
    if (!ejecutar($conexion, 'DELETE FROM horarios WHERE hor_codigo = ?', 'i', [$codigo])) {
        fallar('No se pudo borrar la clase.', 500);
    }
    responder(['ok' => true]);
}

/* ---------- Acción desconocida ----------
   Qué hace: Si la acción no es ninguna de las anteriores, responde con error.
   Por qué: Protege contra peticiones raras. */
fallar('Acción no válida.');