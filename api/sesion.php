<?php
require __DIR__ . '/util.php';

if (empty($_SESSION['rol']) || empty($_SESSION['codigo'])) {
    responder(['ok' => false]);
}

$u = cargar_usuario($conexion, $_SESSION['rol'], (int)$_SESSION['codigo']);

// Si la cuenta ya no existe, o es un profesor que dejó de estar aprobado, se cierra la sesión
if (!$u || !cuenta_activa($u)) {
    $_SESSION = [];
    session_destroy();
    responder(['ok' => false]);
}

responder(['ok' => true, 'usuario' => $u]);