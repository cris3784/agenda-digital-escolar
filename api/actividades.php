<?php
require __DIR__ . '/actividades_lib.php';
exigir_sesion();

$c = contexto($conexion);

if ($c['rol'] === 'estudiante') {
    $filas = consulta_actividades($conexion, 'WHERE a.act_gru_grupo IS NULL OR a.act_gru_grupo = ?', 's', [$c['grupo']]);
} else {
    $filas = consulta_actividades($conexion);
    if ($c['rol'] === 'profesor' || $c['rol'] === 'acudiente') {
        $filas = array_values(array_filter($filas, function ($a) use ($c) {
            return puede_ver($c, $a);
        }));
    }
}

responder(['ok' => true, 'actividades' => armar_actividades($conexion, $c, $filas)]);
