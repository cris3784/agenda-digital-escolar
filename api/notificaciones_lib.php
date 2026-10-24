<?php
// Funciones compartidas por los archivos de notificaciones.
require __DIR__ . '/actividades_lib.php';

function columna_lectura($rol) {
    $m = ['estudiante' => 'lec_est_estudiante', 'profesor' => 'lec_pro_profesor', 'admin' => 'lec_adm_administrador'];
    return $m[$rol];
}

// ¿Le corresponde esta notificación a quien tiene la sesión?
function notificacion_visible($c, $n) {
    // Lo que publiqué yo no me avisa a mí
    if ($n['not_autor_rol'] === $c['rol'] && (int)$n['not_autor_codigo'] === $c['codigo']) {
        return false;
    }
    // Dirigidas a una sola cuenta (ej. "tu trabajo fue calificado")
    if ($n['not_est_estudiante'] !== null) {
        return $c['rol'] === 'estudiante' && (int)$n['not_est_estudiante'] === $c['codigo'];
    }
    if ($n['not_pro_profesor'] !== null) {
        return $c['rol'] === 'profesor' && (int)$n['not_pro_profesor'] === $c['codigo'];
    }
    if (!empty($n['not_para_admin'])) {
        return $c['rol'] === 'admin';
    }
    // Para todos o para un grupo
    $g = $n['not_gru_grupo'];
    if ($g === null || $g === '' || $c['rol'] === 'admin') {
        return true;
    }
    if ($c['rol'] === 'profesor') {
        foreach ($c['asig'] as $a) {
            if ($a['gru'] === null || $a['gru'] === $g) {
                return true;
            }
        }
        return false;
    }
    return $g === $c['grupo'];
}

// Las últimas notificaciones que esta cuenta puede ver (todas las filas, sin juntar lotes)
function notificaciones_visibles($conexion, $c) {
    $filas = filas($conexion, 'SELECT * FROM notificaciones ORDER BY not_codigo DESC LIMIT 400');
    $vis = [];
    foreach ($filas as $n) {
        if (notificacion_visible($c, $n)) {
            $vis[] = $n;
        }
    }
    return $vis;
}

function marcar_leida($conexion, $c, $codigoNotificacion) {
    $col = columna_lectura($c['rol']);
    $ya = filas($conexion, "SELECT lec_codigo FROM lecturas WHERE lec_not_notificacion = ? AND {$col} = ? LIMIT 1", 'ii', [$codigoNotificacion, $c['codigo']]);
    if (!$ya) {
        ejecutar($conexion, "INSERT INTO lecturas (lec_not_notificacion, {$col}, lec_leida) VALUES (?, ?, ?)", 'iis', [$codigoNotificacion, $c['codigo'], ahora()]);
    }
}
