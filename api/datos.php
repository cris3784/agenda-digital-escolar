<?php
require __DIR__ . '/util.php';
exigir_sesion();

$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];

// Cada persona recibe SU cuenta completa; las de los demás llegan en versión pública
// (sin fecha de nacimiento ni correos). Solo el administrador recibe todo.
$yo = cargar_usuario($conexion, $rol, $codigo);
if (!$yo || !cuenta_activa($yo)) {
    $_SESSION = [];
    session_destroy();
    fallar('Tu sesión ya no es válida.', 401);
}

if ($rol === 'admin') {
    $otros = listar_todos($conexion);
} elseif ($rol === 'profesor') {
    $otros = listar_estudiantes_de_profesor($conexion, $yo);
} elseif ($rol === 'acudiente') {
    $otros = [];
} else {
    $otros = listar_profesores_de_grupo($conexion, $yo['grade']);
}

$usuarios = [$yo];
foreach ($otros as $u) {
    if ($u['id'] !== $yo['id']) {
        $usuarios[] = $u;
    }
}

responder(['ok' => true, 'usuarios' => $usuarios]);