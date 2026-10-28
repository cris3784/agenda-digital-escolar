<?php
/* =========================================================
   CALIFICAR UNA ENTREGA
   Qué hace: El profesor (o el administrador) pone la nota y el comentario de una entrega.
   Por qué: Las notas se guardan en el servidor y solo quien gestiona esa actividad puede ponerlas.
   ========================================================= */

// El profesor (o el administrador) pone la nota y el comentario de una entrega.

/* ---------- Cargar las herramientas ----------
   Qué hace: Trae actividades_lib.php (permisos y funciones comunes).
   Por qué: Para no repetir código. */
require __DIR__ . '/actividades_lib.php';

/* ---------- Solo POST y sesión ----------
   Qué hace: Rechaza otros tipos de petición y exige sesión iniciada. */
solo_post();
exigir_sesion();

/* ---------- Quién es la persona ----------
   Qué hace: Si no es profesor ni administrador, responde 403. */
$c = contexto($conexion);
if ($c['rol'] !== 'admin' && $c['rol'] !== 'profesor') {
    fallar('No tienes permiso para hacer esto.', 403);
}

/* ---------- Datos recibidos ----------
   Qué hace: Lee la actividad, el usuario del estudiante, la nota y el comentario. */
$d = entrada();
$codigo     = (int)($d['actividad'] ?? 0);
$usuario    = trim((string)($d['usuario'] ?? ''));
$comentario = trim((string)($d['comentario'] ?? ''));
$notaTexto  = $d['nota'] ?? null;

/* ---------- Buscar la actividad ----------
   Qué hace: Si no existe responde 404; si la persona no la gestiona, responde 403.
   Por qué: Un profesor no califica actividades de otra materia. */
$a = $codigo > 0 ? cargar_actividad_fila($conexion, $codigo) : null;
if (!$a) {
    fallar('Esa actividad ya no existe.', 404);
}
if (!puede_gestionar($c, $a)) {
    fallar('No tienes permiso para hacer esto.', 403);
}

/* ---------- Revisar la nota ----------
   Qué hace: Debe ser un número entre 1 y 5; se redondea a un decimal.
   Por qué: La nota puede quedar vacía. */
$nota = null;
if ($notaTexto !== null && $notaTexto !== '') {
    if (!is_numeric($notaTexto) || $notaTexto < 1 || $notaTexto > 5) {
        fallar('La nota debe estar entre 1 y 5.');
    }
    $nota = number_format(round((float)$notaTexto, 1), 1, '.', '');
}

/* ---------- Revisar el comentario ----------
   Qué hace: Máximo 300 letras; si está vacío queda en blanco. */
if (largo($comentario) > 300) {
    fallar('El comentario puede tener máximo 300 letras.');
}
if ($comentario === '') {
    $comentario = null;
}

/* ---------- Buscar al estudiante ----------
   Qué hace: Comprueba que el estudiante exista. */
$est = filas($conexion, 'SELECT est_codigo FROM estudiantes WHERE est_usuario = ? LIMIT 1', 's', [$usuario]);
if (!$est) {
    fallar('Ese estudiante no existe.', 404);
}
$estudiante = (int)$est[0]['est_codigo'];

/* ---------- Que haya entregado ----------
   Qué hace: Si el estudiante no ha entregado, responde 404.
   Por qué: No se puede calificar algo que no existe. */
if (!filas($conexion, 'SELECT ent_codigo FROM entregas WHERE ent_act_actividad = ? AND ent_est_estudiante = ?', 'ii', [$codigo, $estudiante])) {
    fallar('Ese estudiante todavía no ha entregado.', 404);
}

/* ---------- Guardar la nota ----------
   Qué hace: Guarda la nota, el comentario y la fecha de calificación. */
if (!ejecutar(
    $conexion,
    'UPDATE entregas SET ent_nota = ?, ent_comentario = ?, ent_calificada = ? WHERE ent_act_actividad = ? AND ent_est_estudiante = ?',
    'sssii',
    [$nota, $comentario, ahora(), $codigo, $estudiante]
)) {
    fallar('No se pudo guardar la nota.', 500);
}

/* ---------- Responder ----------
   Qué hace: Devuelve la actividad ya actualizada.
   Por qué: Así la página se actualiza sin recargar. */
responder(['ok' => true, 'actividad' => actividad_armada($conexion, $c, $codigo)]);