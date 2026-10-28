<?php
/* =========================================================
   HORARIOS
   Qué hace: Devuelve los horarios: una lista de clases por grupo, ya ordenada por días.
   Por qué: Cada rol recibe solo lo que le toca: el estudiante su grupo, el profesor sus grupos y el administrador todos.
   ========================================================= */

// Horarios: una lista de clases por grupo, ya ordenada por días.
// Estudiante = su grupo · profesor = sus grupos · administrador = todos los grupos.

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae actividades_lib.php (permisos y funciones comunes).
   Por qué: Para no repetir código. */
require __DIR__ . '/actividades_lib.php';
exigir_sesion();

/* ---------- Quién es la persona ----------
   Qué hace: Saca el rol, el grupo y las materias de quien tiene la sesión.
   Por qué: Con eso se decide qué horarios puede ver. */
$c = contexto($conexion);

/* ---------- Escribir la hora corta ----------
   Qué hace: Convierte 13:05:00 en 1:05.
   Por qué: Es como se muestra en la página. */
function hora_corta($t) {
    $p = explode(':', (string)$t);
    $h = (int)$p[0];
    $m = (int)($p[1] ?? 0);
    return ($h % 12 === 0 ? 12 : $h % 12) . ':' . str_pad((string)$m, 2, '0', STR_PAD_LEFT);
}

/* ---------- Todos los grupos ----------
   Qué hace: Trae la lista de grupos del colegio.
   Por qué: Es la base para decidir cuáles se envían. */
$todos = [];
foreach (filas($conexion, 'SELECT gru_codigo AS g FROM grupos') as $f) {
    $todos[] = $f['g'];
}

/* ---------- Ordenar ----------
   Qué hace: Ordena los grupos (6-1, 6-2… 11-9).
   Por qué: Para que se vean en orden. */
// Orden natural: 6-1, 6-2 ... 10-1 ... 11-9
usort($todos, function ($a, $b) {
    $x = array_map('intval', explode('-', $a));
    $y = array_map('intval', explode('-', $b));
    return [$x[0], $x[1] ?? 0] <=> [$y[0], $y[1] ?? 0];
});

/* ---------- Qué grupos ve cada rol ----------
   Qué hace: Admin: todos. Estudiante: el suyo. Acudiente: los de sus hijos. Profesor: los que atiende (o todos si no tiene límite).
   Por qué: Cada persona ve solo lo que le corresponde. */
if ($c['rol'] === 'admin') {
    $grupos = $todos;
} elseif ($c['rol'] === 'estudiante') {
    $grupos = in_array($c['grupo'], $todos, true) ? [$c['grupo']] : [];
} elseif ($c['rol'] === 'acudiente') {
    $grupos = array_values(array_filter($todos, function ($g) use ($c) {
        return in_array($g, $c['grupos'], true);
    }));
} else {
    $sinLimite = false;
    $mios = [];
    foreach ($c['asig'] as $a) {
        if ($a['gru'] === null) {
            $sinLimite = true;
        } else {
            $mios[$a['gru']] = true;
        }
    }
    $grupos = $sinLimite ? $todos : array_values(array_filter($todos, function ($g) use ($mios) {
        return isset($mios[$g]);
    }));
}

/* ---------- Sin grupos ----------
   Qué hace: Si no hay ningún grupo para mostrar, responde con una lista vacía.
   Por qué: Evita consultas innecesarias. */
if (!$grupos) {
    responder(['ok' => true, 'horarios' => (object)[]]);
}

/* ---------- Preparar los días ----------
   Qué hace: Arma para cada grupo los cinco días (lunes a viernes) vacíos.
   Por qué: Así todos los días aparecen aunque no tengan clases. */
$dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
$salida = [];
$indice = [];
foreach ($grupos as $g) {
    $salida[$g] = [];
    foreach ($dias as $i => $d) {
        $salida[$g][] = ['day' => $d, 'classes' => []];
        $indice[$g][$d] = $i;
    }
}

/* ---------- Pedir las clases ----------
   Qué hace: Trae de la base de datos las clases de esos grupos con la materia, el salón y el profesor, ordenadas por hora.
   Por qué: Una sola consulta para todos los grupos es más rápida. */
$marcas = implode(',', array_fill(0, count($grupos), '?'));
$filas = filas(
    $conexion,
    "SELECT h.hor_codigo AS id, h.hor_gru_grupo AS g, h.hor_dia AS dia, h.hor_inicio AS ini, h.hor_fin AS fin, h.hor_salon AS salon, m.mat_nombre AS materia, p.pro_usuario AS profe
     FROM horarios h
     JOIN materias m ON m.mat_codigo = h.hor_mat_materia
     LEFT JOIN profesores p ON p.pro_codigo = h.hor_pro_profesor
     WHERE h.hor_gru_grupo IN ({$marcas})
     ORDER BY h.hor_inicio, h.hor_codigo",
    str_repeat('s', count($grupos)),
    $grupos
);

/* ---------- Poner cada clase en su día ----------
   Qué hace: Ubica cada clase en su grupo y día con su hora, salón y profesor.
   Por qué: Es la forma que el JavaScript de la página ya sabe leer. */
foreach ($filas as $f) {
    $g = $f['g'];
    $d = $f['dia'];
    if (!isset($indice[$g][$d])) {                       // un día que no es de lunes a viernes
        $salida[$g][] = ['day' => $d, 'classes' => []];
        $indice[$g][$d] = count($salida[$g]) - 1;
    }
    $clase = [
        'id'      => (int)$f['id'],
        'subject' => $f['materia'],
        'time'    => hora_corta($f['ini']) . ' - ' . hora_corta($f['fin']),
        'room'    => (string)$f['salon']
    ];
    if ($f['profe'] !== null) {
        $clase['teacher'] = $f['profe'];
    }
    $salida[$g][$indice[$g][$d]]['classes'][] = $clase;
}

/* ---------- Responder ----------
   Qué hace: Manda los horarios en formato JSON. */
responder(['ok' => true, 'horarios' => $salida]);