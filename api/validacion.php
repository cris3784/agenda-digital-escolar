<?php
// Aprobación de profesores. Solo el administrador.
//   {accion:"listar"}                       -> profesores pendientes y rechazados
//   {accion:"aprobar"|"rechazar", codigo:N} -> cambia el estado
require __DIR__ . '/util.php';
solo_post();
exigir_admin();

$d = entrada();
$accion = (string)($d['accion'] ?? 'listar');

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

if ($accion !== 'listar') {
    fallar('Acción no válida.');
}

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

responder(['ok' => true, 'profesores' => $lista]);