<?php
require __DIR__ . '/util.php';
exigir_sesion();

$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];

$yo = cargar_usuario($conexion, $rol, $codigo);
if (!$yo) {
    $_SESSION = [];
    session_destroy();
    fallar('Tu sesión ya no es válida.', 401);
}

if ($rol === 'admin') {
    $otros = listar_todos($conexion);
} elseif ($rol === 'profesor') {
    $otros = listar_estudiantes_de_profesor($conexion, $yo);
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
