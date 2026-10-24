<?php
// Lista de grupos del colegio (6-1 ... 11-9). No necesita sesión: el registro la usa.
require __DIR__ . '/util.php';

$grupos = [];
foreach (filas($conexion, 'SELECT gru_codigo AS g FROM grupos') as $f) {
    $grupos[] = $f['g'];
}
// Orden natural: 6-1, 6-2 ... 10-1 ... 11-9
usort($grupos, function ($a, $b) {
    $x = array_map('intval', explode('-', $a));
    $y = array_map('intval', explode('-', $b));
    return [$x[0], $x[1] ?? 0] <=> [$y[0], $y[1] ?? 0];
});

responder(['ok' => true, 'grupos' => $grupos]);
