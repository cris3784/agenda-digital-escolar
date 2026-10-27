<?php
// Publicar una notificación. Solo profesores y administrador (nunca estudiantes).
require __DIR__ . '/notificaciones_lib.php';
solo_post();
exigir_sesion();

$c = contexto($conexion);
if ($c['rol'] !== 'admin' && $c['rol'] !== 'profesor') {
    fallar('No tienes permiso para hacer esto.', 403);
}

$d = entrada();
$tipo   = (string)($d['type'] ?? 'aviso');
$titulo = trim((string)($d['title'] ?? ''));
$texto  = trim((string)($d['text'] ?? ''));
$pagina = (string)($d['page'] ?? '');
$para   = trim((string)($d['to'] ?? ''));
$grupos = lista_texto($d['groups'] ?? []);

if (!in_array($tipo, ['actividad', 'calendario', 'horario', 'aviso'], true)) {
    $tipo = 'aviso';
}
if (!in_array($pagina, ['actividades', 'calendario', 'horario'], true)) {
    $pagina = '';
}
if ($titulo === '') {
    fallar('Escribe el título del aviso.');
}
$recortar = function ($t, $max) {
    return function_exists('mb_substr') ? mb_substr($t, 0, $max, 'UTF-8') : substr($t, 0, $max);
};
$titulo = $recortar($titulo, 150);
$texto  = $recortar($texto, 300);

$nombreAutor = '';
$yo = cargar_usuario($conexion, $c['rol'], $c['codigo']);
if ($yo) {
    $nombreAutor = $recortar((string)$yo['name'], 100);
}

$est = null;
$pro = null;

// Grupos que atiende el profesor (null en la lista = sin límite de grupo)
$sinLimite = ($c['rol'] === 'admin');
$mios = [];
if ($c['rol'] === 'profesor') {
    foreach ($c['asig'] as $a) {
        if ($a['gru'] === null) {
            $sinLimite = true;
        } elseif (!in_array($a['gru'], $mios, true)) {
            $mios[] = $a['gru'];
        }
    }
}

if ($para !== '') {
    // Dirigida a una sola cuenta
    $f = filas($conexion, 'SELECT est_codigo AS c, est_gru_grupo AS g FROM estudiantes WHERE est_usuario = ? LIMIT 1', 's', [$para]);
    if ($f) {
        // un profesor solo le avisa a estudiantes de sus grupos
        if (!$sinLimite && !in_array($f[0]['g'], $mios, true)) {
            fallar('Solo puedes avisar a estudiantes de tus grupos.', 403);
        }
        $est = (int)$f[0]['c'];
    } else {
        if ($c['rol'] !== 'admin') {
            fallar('Solo puedes avisar a estudiantes de tus grupos.', 403);
        }
        $f = filas($conexion, 'SELECT pro_codigo AS c FROM profesores WHERE pro_usuario = ? LIMIT 1', 's', [$para]);
        if (!$f) {
            fallar('Esa cuenta no existe.', 404);
        }
        $pro = (int)$f[0]['c'];
    }
    $grupos = [];
} else {
    foreach ($grupos as $g) {
        if (!filas($conexion, 'SELECT gru_codigo FROM grupos WHERE gru_codigo = ?', 's', [$g])) {
            fallar('El grupo "' . $g . '" no existe.');
        }
    }
    if ($c['rol'] === 'profesor') {
        if ($grupos) {
            if (!$sinLimite) {
                foreach ($grupos as $g) {
                    if (!in_array($g, $mios, true)) {
                        fallar('Solo puedes avisar a tus grupos.', 403);
                    }
                }
            }
        } elseif (!$sinLimite && $mios) {
            $grupos = $mios;      // un profesor con grupos nunca avisa a todo el colegio
        }
    }
}

$filasAInsertar = $grupos ? $grupos : [null];
$lote = count($filasAInsertar) > 1 ? bin2hex(random_bytes(6)) : null;
$ahora = ahora();
$sinAdmin = 0;

foreach ($filasAInsertar as $g) {
    if (!ejecutar(
        $conexion,
        'INSERT INTO notificaciones (not_tipo, not_titulo, not_texto, not_pagina, not_gru_grupo, not_est_estudiante, not_pro_profesor, not_para_admin, not_creada, not_autor_rol, not_autor_codigo, not_autor_nombre, not_lote) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        'sssssiiississ',
        [$tipo, $titulo, $texto, $pagina, $g, $est, $pro, $sinAdmin, $ahora, $c['rol'], $c['codigo'], $nombreAutor, $lote]
    )) {
        fallar('No se pudo publicar la notificación.', 500);
    }
}

// Se borran las muy antiguas (4 meses) para que la tabla no crezca sin fin
ejecutar($conexion, 'DELETE FROM notificaciones WHERE not_creada < ?', 's', [date('Y-m-d H:i:s', time() - 120 * 86400)]);

responder(['ok' => true]);