<?php
$esLocal = in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1']);

if ($esLocal) {
    $host    = 'localhost';
    $usuario = 'root';
    $clave   = '';
    $base    = 'ade';
} else {
    $host    = 'sql302.infinityfree.com';
    $usuario = 'if0_43229914';
    $clave   = 'R6mg0AqRMMfmHM';
    $base    = 'if0_43229914_ade';
}

mysqli_report(MYSQLI_REPORT_OFF);
$conexion = new mysqli($host, $usuario, $clave, $base);

if ($conexion->connect_errno) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'No se pudo conectar a la base de datos']);
    exit;
}

$conexion->set_charset('utf8mb4');
