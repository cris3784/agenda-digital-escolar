<?php
// Marcar notificaciones como leídas (algunas por su código, o todas).
require __DIR__ . '/notificaciones_lib.php';
solo_post();
exigir_sesion();

$c = contexto($conexion);
$d = entrada();

if (!empty($d['todas'])) {
    foreach (notificaciones_visibles($conexion, $c) as $n) {
        marcar_leida($conexion, $c, (int)$n['not_codigo']);
    }
    responder(['ok' => true]);
}

$ids = is_array($d['ids'] ?? null) ? $d['ids'] : [];
$vis = null;
foreach (array_slice($ids, 0, 50) as $id) {
    $id = (int)$id;
    if ($id < 1) {
        continue;
    }
    if ($vis === null) {
        $vis = notificaciones_visibles($conexion, $c);
    }
    // Solo se marcan las que esta cuenta puede ver (y las de su mismo aviso)
    $lote = null;
    $puede = false;
    foreach ($vis as $n) {
        if ((int)$n['not_codigo'] === $id) {
            $puede = true;
            $lote = (string)$n['not_lote'];
            break;
        }
    }
    if (!$puede) {
        continue;
    }
    foreach ($vis as $n) {
        if ((int)$n['not_codigo'] === $id || ($lote !== '' && (string)$n['not_lote'] === $lote)) {
            marcar_leida($conexion, $c, (int)$n['not_codigo']);
        }
    }
}

responder(['ok' => true]);
