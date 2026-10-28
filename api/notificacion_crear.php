<?php
/* =========================================================
   PUBLICAR UNA NOTIFICACIÓN
   Qué hace: Crea un aviso para un grupo, para varios grupos, para todo el colegio o para una sola cuenta.
   Por qué: Es lo que usan los profesores y el administrador para avisar de actividades, cambios de horario o noticias; los estudiantes nunca pueden publicar.
   ========================================================= */

// Publicar una notificación. Solo profesores y administrador (nunca estudiantes).

/* ---------- Cargar las herramientas, exigir POST y sesión ----------
   Qué hace: Trae notificaciones_lib.php (que a su vez carga util.php), acepta solo POST y pide sesión iniciada.
   Por qué: Para no repetir código y para que nadie publique sin identificarse. */
require __DIR__ . '/notificaciones_lib.php';
solo_post();
exigir_sesion();

/* ---------- Revisar el permiso ----------
   Qué hace: Averigua quién es la persona y rechaza a quien no sea administrador ni profesor.
   Por qué: Un estudiante o un acudiente solo reciben avisos, no los crean. */
$c = contexto($conexion);
if ($c['rol'] !== 'admin' && $c['rol'] !== 'profesor') {
    fallar('No tienes permiso para hacer esto.', 403);
}

/* ---------- Leer lo que mandó la página ----------
   Qué hace: Toma el tipo, el título, el texto, la página a la que lleva el aviso, la cuenta destinataria (si es solo para una) y los grupos.
   Por qué: Con esto se decide a quién le llega y cómo se muestra. */
$d = entrada();
$tipo   = (string)($d['type'] ?? 'aviso');
$titulo = trim((string)($d['title'] ?? ''));
$texto  = trim((string)($d['text'] ?? ''));
$pagina = (string)($d['page'] ?? '');
$para   = trim((string)($d['to'] ?? ''));
$grupos = lista_texto($d['groups'] ?? []);

/* ---------- Revisar tipo, página y título ----------
   Qué hace: Si el tipo o la página no son de los permitidos, los reemplaza por uno seguro (aviso, o ninguna página). Si no hay título, responde con un aviso de error.
   Por qué: Evita guardar valores inventados y avisos sin título. */
if (!in_array($tipo, ['actividad', 'calendario', 'horario', 'aviso'], true)) {
    $tipo = 'aviso';
}
if (!in_array($pagina, ['actividades', 'calendario', 'horario'], true)) {
    $pagina = '';
}
if ($titulo === '') {
    fallar('Escribe el título del aviso.');
}

/* ---------- Recortar el título y el texto ----------
   Qué hace: Limita el título a 150 letras y el texto a 300.
   Por qué: Son los tamaños que caben en la base de datos y en la pantalla. */
$recortar = function ($t, $max) {
    return function_exists('mb_substr') ? mb_substr($t, 0, $max, 'UTF-8') : substr($t, 0, $max);
};
$titulo = $recortar($titulo, 150);
$texto  = $recortar($texto, 300);

/* ---------- Nombre de quien publica ----------
   Qué hace: Busca el nombre de la persona que tiene la sesión.
   Por qué: Se guarda con el aviso para mostrar "publicado por". */
$nombreAutor = '';
$yo = cargar_usuario($conexion, $c['rol'], $c['codigo']);
if ($yo) {
    $nombreAutor = $recortar((string)$yo['name'], 100);
}

/* ---------- Destinatarios y grupos que atiende ----------
   Qué hace: Deja vacíos los destinatarios individuales y averigua qué grupos puede avisar quien publica: el administrador, todos; el profesor, los suyos (o todos si no tiene límite).
   Por qué: Un profesor solo debe avisar a los grupos que atiende. */
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

/* ---------- Aviso para una sola cuenta o para grupos ----------
   Qué hace: Si se indicó una cuenta, la busca (primero entre estudiantes y, solo para el administrador, entre profesores) y comprueba que el profesor tenga permiso sobre ese estudiante. Si no, revisa que cada grupo exista y que el profesor solo avise a los suyos.
   Por qué: Evita avisar a quien no corresponde; un profesor con grupos nunca avisa a todo el colegio. */
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

/* ---------- Guardar el aviso ----------
   Qué hace: Crea una fila por cada grupo (o una sola si es para todos o para una cuenta). Si son varios grupos, les pone un mismo código de lote.
   Por qué: El lote permite mostrar un aviso publicado para varios grupos una sola vez. */
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

/* ---------- Borrar las muy antiguas ----------
   Qué hace: Elimina las notificaciones con más de 120 días (unos 4 meses).
   Por qué: Para que la tabla no crezca sin fin. */
// Se borran las muy antiguas (4 meses) para que la tabla no crezca sin fin
ejecutar($conexion, 'DELETE FROM notificaciones WHERE not_creada < ?', 's', [date('Y-m-d H:i:s', time() - 120 * 86400)]);

/* ---------- Responder ----------
   Qué hace: Avisa que todo salió bien. */
responder(['ok' => true]);