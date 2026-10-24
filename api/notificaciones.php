<?php
// Lista de notificaciones de la cuenta (con cuáles ya leyó).
require __DIR__ . '/notificaciones_lib.php';
exigir_sesion();

$c = contexto($conexion);
$vis = notificaciones_visibles($conexion, $c);

// Un aviso que se publicó para varios grupos se muestra una sola vez
$gruposDeLote = [];
foreach ($vis as $n) {
    $l = (string)$n['not_lote'];
    if ($l !== '' && $n['not_gru_grupo'] !== null) {
        $gruposDeLote[$l][] = $n['not_gru_grupo'];
    }
}

$reps = [];
$vistos = [];
foreach ($vis as $n) {
    $l = (string)$n['not_lote'];
    if ($l !== '') {
        if (isset($vistos[$l])) {
            continue;
        }
        $vistos[$l] = true;
    }
    $reps[] = $n;
}
$reps = array_slice($reps, 0, 40);

$leidas = [];
if ($reps) {
    $ids = [];
    foreach ($reps as $n) {
        $ids[] = (int)$n['not_codigo'];
    }
    $col = columna_lectura($c['rol']);
    $f = filas(
        $conexion,
        'SELECT lec_not_notificacion AS n FROM lecturas WHERE lec_not_notificacion IN (' . implode(',', $ids) . ") AND {$col} = ?",
        'i',
        [$c['codigo']]
    );
    foreach ($f as $x) {
        $leidas[(int)$x['n']] = true;
    }
}

$salida = [];
foreach ($reps as $n) {
    $l = (string)$n['not_lote'];
    if ($l !== '') {
        $grupos = array_values(array_unique($gruposDeLote[$l] ?? []));
        $grupos = $grupos ? $grupos : null;
    } else {
        $grupos = $n['not_gru_grupo'] !== null ? [$n['not_gru_grupo']] : null;
    }
    $salida[] = [
        'id'     => (string)(int)$n['not_codigo'],
        'type'   => (string)$n['not_tipo'],
        'title'  => (string)$n['not_titulo'],
        'text'   => (string)$n['not_texto'],
        'groups' => $grupos,
        'page'   => (string)$n['not_pagina'],
        'to'     => '',
        'by'     => '',
        'byName' => (string)$n['not_autor_nombre'],
        'role'   => (string)$n['not_autor_rol'],
        'date'   => date('c', strtotime($n['not_creada'])),
        'read'   => isset($leidas[(int)$n['not_codigo']])
    ];
}

responder(['ok' => true, 'notificaciones' => $salida]);
