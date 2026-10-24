<?php
// COPIA DE EJEMPLO para GitHub.
// Para usar el proyecto: copia este archivo como "conexion.php" y pon tus datos reales.
// El archivo real "conexion.php" NO se sube a GitHub (está en .gitignore).
$esLocal = in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1']);

if ($esLocal) {
    $host    = 'localhost';
    $usuario = 'root';
    $clave   = '';
    $base    = 'ade';
} else {
    $host    = 'sql000.ejemplo.com';
    $usuario = 'usuario_bd';
    $clave   = 'contraseña';
    $base    = 'nombre_bd';
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