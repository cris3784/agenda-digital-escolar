<?php
// El profesor (o el administrador) pone la nota y el comentario de una entrega.
require __DIR__ . '/actividades_lib.php';
solo_post();
exigir_sesion();

$c = contexto($conexion);
if ($c['rol'] !== 'admin' && $c['rol'] !== 'profesor') {
    fallar('No tienes permiso para hacer esto.', 403);
}

$d = entrada();
$codigo     = (int)($d['actividad'] ?? 0);
$usuario    = trim((string)($d['usuario'] ?? ''));
$comentario = trim((string)($d['comentario'] ?? ''));
$notaTexto  = $d['nota'] ?? null;

$a = $codigo > 0 ? cargar_actividad_fila($conexion, $codigo) : null;
if (!$a) {
    fallar('Esa actividad ya no existe.', 404);
}
if (!puede_gestionar($c, $a)) {
    fallar('No tienes permiso para hacer esto.', 403);
}

$nota = null;
if ($notaTexto !== null && $notaTexto !== '') {
    if (!is_numeric($notaTexto) || $notaTexto < 1 || $notaTexto > 5) {
        fallar('La nota debe estar entre 1 y 5.');
    }
    $nota = number_format(round((float)$notaTexto, 1), 1, '.', '');
}
if (largo($comentario) > 300) {
    fallar('El comentario puede tener máximo 300 letras.');
}
if ($comentario === '') {
    $comentario = null;
}

$est = filas($conexion, 'SELECT est_codigo FROM estudiantes WHERE est_usuario = ? LIMIT 1', 's', [$usuario]);
if (!$est) {
    fallar('Ese estudiante no existe.', 404);
}
$estudiante = (int)$est[0]['est_codigo'];

if (!filas($conexion, 'SELECT ent_codigo FROM entregas WHERE ent_act_actividad = ? AND ent_est_estudiante = ?', 'ii', [$codigo, $estudiante])) {
    fallar('Ese estudiante todavía no ha entregado.', 404);
}

if (!ejecutar(
    $conexion,
    'UPDATE entregas SET ent_nota = ?, ent_comentario = ?, ent_calificada = ? WHERE ent_act_actividad = ? AND ent_est_estudiante = ?',
    'sssii',
    [$nota, $comentario, ahora(), $codigo, $estudiante]
)) {
    fallar('No se pudo guardar la nota.', 500);
}

responder(['ok' => true, 'actividad' => actividad_armada($conexion, $c, $codigo)]);