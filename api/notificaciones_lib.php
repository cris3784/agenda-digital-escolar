<?php
// Funciones compartidas por los archivos de notificaciones.
require __DIR__ . '/actividades_lib.php';

function columna_lectura($rol) {
    $m = ['estudiante' => 'lec_est_estudiante', 'profesor' => 'lec_pro_profesor', 'admin' => 'lec_adm_administrador', 'acudiente' => 'lec_acu_acudiente'];
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
    if ($c['rol'] === 'acudiente') {
        return in_array($g, $c['grupos'], true);
    }
    return $g === $c['grupo'];
}

// Las últimas notificaciones que esta cuenta puede ver (todas las filas, sin juntar lotes).
// El filtro se hace en la consulta SQL: ya no se traen las del colegio entero.
function notificaciones_visibles($conexion, $c) {
    $rol = $c['rol'];
    $tipos = '';
    $params = [];

    // Lo que publiqué yo no me avisa a mí
    $donde = '(not_autor_rol IS NULL OR not_autor_rol <> ? OR not_autor_codigo IS NULL OR not_autor_codigo <> ?)';
    $tipos .= 'si';
    $params[] = $rol;
    $params[] = (int)$c['codigo'];

    if ($rol === 'admin') {
        // dirigidas a un estudiante o profesor concreto no le llegan; todo lo demás sí
        $donde .= ' AND not_est_estudiante IS NULL AND not_pro_profesor IS NULL';
    } else {
        // las marcadas "solo admin" no son para nadie más
        $general = 'not_est_estudiante IS NULL AND not_pro_profesor IS NULL AND COALESCE(not_para_admin, 0) = 0';

        // condición de grupo
        $grupos = [];
        $libre = false;
        if ($rol === 'estudiante') {
            $grupos = [(string)$c['grupo']];
        } elseif ($rol === 'acudiente') {
            $grupos = array_values($c['grupos']);
        } elseif ($rol === 'profesor') {
            foreach ($c['asig'] as $a) {
                if ($a['gru'] === null) {
                    $libre = true;
                } elseif (!in_array($a['gru'], $grupos, true)) {
                    $grupos[] = $a['gru'];
                }
            }
        }

        $tiposG = '';
        $paramsG = [];
        if (!$libre) {
            $g = "(not_gru_grupo IS NULL OR not_gru_grupo = '')";
            if ($grupos) {
                $g = "(not_gru_grupo IS NULL OR not_gru_grupo = '' OR not_gru_grupo IN (" . implode(',', array_fill(0, count($grupos), '?')) . '))';
                $tiposG = str_repeat('s', count($grupos));
                $paramsG = $grupos;
            }
            $general .= ' AND ' . $g;
        }

        if ($rol === 'estudiante') {
            $donde .= " AND (not_est_estudiante = ? OR ($general))";
            $tipos .= 'i' . $tiposG;
            $params = array_merge($params, [(int)$c['codigo']], $paramsG);
        } elseif ($rol === 'profesor') {
            $donde .= " AND (not_pro_profesor = ? OR ($general))";
            $tipos .= 'i' . $tiposG;
            $params = array_merge($params, [(int)$c['codigo']], $paramsG);
        } else {
            $donde .= " AND ($general)";
            $tipos .= $tiposG;
            $params = array_merge($params, $paramsG);
        }
    }

    // Los parámetros están en el mismo orden en que aparecen los "?" del SQL
    $filas = filas($conexion, "SELECT * FROM notificaciones WHERE {$donde} ORDER BY not_codigo DESC LIMIT 400", $tipos, $params);

    // Segunda revisión con la regla original, por seguridad
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