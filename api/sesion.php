<?php
require __DIR__ . '/util.php';

if (empty($_SESSION['rol']) || empty($_SESSION['codigo'])) {
    responder(['ok' => false]);
}

$u = cargar_usuario($conexion, $_SESSION['rol'], (int)$_SESSION['codigo']);

if (!$u) {
    $_SESSION = [];
    session_destroy();
    responder(['ok' => false]);
}

responder(['ok' => true, 'usuario' => $u]);
