<?php
require __DIR__ . '/util.php';

$filas = filas($conexion, 'SELECT mat_nombre AS nombre FROM materias ORDER BY mat_codigo');
$nombres = [];
foreach ($filas as $f) {
    $nombres[] = $f['nombre'];
}

responder(['ok' => true, 'materias' => $nombres]);
