<?php
/* =========================================================
   APROBACIÓN DE PROFESORES
   Qué hace: Lista los profesores que están pendientes o fueron rechazados y deja aprobarlos o rechazarlos.
   Por qué: Un profesor no puede usar el sistema hasta que un administrador lo apruebe; por eso solo el administrador puede usar este archivo.
   ========================================================= */

// Aprobación de profesores. Solo el administrador.
//   {accion:"listar"}                       -> profesores pendientes y rechazados
//   {accion:"aprobar"|"rechazar", codigo:N} -> cambia el estado

/* ---------- Solo POST y solo administrador ----------
   Qué hace: Carga las herramientas, rechaza otros tipos de petición y a cualquiera que no sea administrador.
   Por qué: Nadie más debe poder aprobar profesores. */
require __DIR__ . '/util.php';
solo_post();
exigir_admin();

/* ---------- Leer la acción pedida ----------
   Qué hace: Toma los datos enviados y la acción (por defecto, listar).
   Por qué: Un solo archivo maneja las tres acciones. */
$d = entrada();
$accion = (string)($d['accion'] ?? 'listar');

/* ---------- Aprobar o rechazar ----------
   Qué hace: Comprueba que el profesor exista (si no, responde 404) y cambia su estado a "aprobado" o "rechazado".
   Por qué: Es la decisión del administrador; el profesor solo puede entrar cuando queda aprobado. */
if ($accion === 'aprobar' || $accion === 'rechazar') {
    $codigo = (int)($d['codigo'] ?? 0);
    if ($codigo < 1 || !filas($conexion, 'SELECT pro_codigo FROM profesores WHERE pro_codigo = ?', 'i', [$codigo])) {
        fallar('Ese profesor ya no existe.', 404);
    }
    $estado = $accion === 'aprobar' ? 'aprobado' : 'rechazado';
    if (!ejecutar($conexion, 'UPDATE profesores SET pro_estado = ? WHERE pro_codigo = ?', 'si', [$estado, $codigo])) {
        fallar('No se pudo guardar el cambio.', 500);
    }
    responder(['ok' => true, 'estado' => $estado]);
}

/* ---------- Acción desconocida ----------
   Qué hace: Si la acción no es aprobar, rechazar ni listar, responde con error.
   Por qué: Protege contra peticiones raras. */
if ($accion !== 'listar') {
    fallar('Acción no válida.');
}

/* ---------- Buscar los profesores por revisar ----------
   Qué hace: Trae los profesores que no están aprobados, con sus materias y grupos juntos en un texto; los pendientes salen primero y, dentro de cada estado, los más recientes.
   Por qué: Así el administrador ve primero a quienes están esperando su decisión. */
$f = filas(
    $conexion,
    "SELECT p.pro_codigo AS codigo, p.pro_nombre AS nombre, p.pro_apellidos AS apellidos, p.pro_usuario AS usuario, p.pro_correo AS correo, p.pro_estado AS estado, p.pro_creado AS creado,
            GROUP_CONCAT(DISTINCT m.mat_nombre SEPARATOR ', ') AS materias,
            GROUP_CONCAT(DISTINCT a.asi_gru_grupo SEPARATOR ', ') AS grupos
     FROM profesores p
     LEFT JOIN asignaciones a ON a.asi_pro_profesor = p.pro_codigo
     LEFT JOIN materias m ON m.mat_codigo = a.asi_mat_materia
     WHERE p.pro_estado <> 'aprobado'
     GROUP BY p.pro_codigo
     ORDER BY (p.pro_estado = 'pendiente') DESC, p.pro_creado DESC"
);

/* ---------- Armar la lista ----------
   Qué hace: Convierte cada profesor a la forma que lee el JavaScript de la página (nombre, usuario, correo, estado, materias, grupos y fecha de registro).
   Por qué: La página espera esos nombres de campo, no los de la base de datos. */
$lista = [];
foreach ($f as $x) {
    $lista[] = [
        'codigo'   => (int)$x['codigo'],
        'name'     => trim($x['nombre'] . ' ' . $x['apellidos']),
        'username' => $x['usuario'],
        'email'    => $x['correo'],
        'estado'   => $x['estado'],
        'subjects' => (string)$x['materias'],
        'groups'   => (string)$x['grupos'],
        'createdAt'=> date('d/m/Y, g:i a', strtotime($x['creado']))
    ];
}

/* ---------- Responder ----------
   Qué hace: Manda la lista en formato JSON. */
responder(['ok' => true, 'profesores' => $lista]);