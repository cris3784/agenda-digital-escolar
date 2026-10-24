<?php
// Horarios: una lista de clases por grupo, ya ordenada por días.
// Estudiante = su grupo · profesor = sus grupos · administrador = todos los grupos.
require __DIR__ . '/actividades_lib.php';
exigir_sesion();

$c = contexto($conexion);

function hora_corta($t) {
    $p = explode(':', (string)$t);
    $h = (int)$p[0];
    $m = (int)($p[1] ?? 0);
    return ($h % 12 === 0 ? 12 : $h % 12) . ':' . str_pad((string)$m, 2, '0', STR_PAD_LEFT);
}

$todos = [];
foreach (filas($conexion, 'SELECT gru_codigo AS g FROM grupos') as $f) {
    $todos[] = $f['g'];
}
// Orden natural: 6-1, 6-2 ... 10-1 ... 11-9
usort($todos, function ($a, $b) {
    $x = array_map('intval', explode('-', $a));
    $y = array_map('intval', explode('-', $b));
    return [$x[0], $x[1] ?? 0] <=> [$y[0], $y[1] ?? 0];
});

if ($c['rol'] === 'admin') {
    $grupos = $todos;
} elseif ($c['rol'] === 'estudiante') {
    $grupos = in_array($c['grupo'], $todos, true) ? [$c['grupo']] : [];
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

if (!$grupos) {
    responder(['ok' => true, 'horarios' => (object)[]]);
}

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

responder(['ok' => true, 'horarios' => $salida]);
