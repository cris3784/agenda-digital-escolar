<?php
require __DIR__ . '/util.php';
solo_post();
exigir_sesion();

$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];
list($tabla, $p) = ROLES[$rol];

$nombre = trim((string)($_POST['nombre'] ?? ''));

if ($nombre !== '') {
    if (largo($nombre) < 2 || largo($nombre) > 100) {
        fallar('Escribe tu nombre completo.');
    }
    if (!ejecutar($conexion, "UPDATE {$tabla} SET {$p}_nombre = ? WHERE {$p}_codigo = ?", 'si', [$nombre, $codigo])) {
        fallar('No se pudo guardar el nombre.', 500);
    }
}

$dir = dirname(__DIR__) . '/uploads/fotos';
$destino = $dir . '/' . $p . '_' . $codigo . '.jpg';
$ruta = 'uploads/fotos/' . $p . '_' . $codigo . '.jpg';

if (($_POST['quitar_foto'] ?? '') === '1') {
    if (is_file($destino)) {
        @unlink($destino);
    }
    ejecutar($conexion, "UPDATE {$tabla} SET {$p}_foto = NULL WHERE {$p}_codigo = ?", 'i', [$codigo]);
} elseif (!empty($_FILES['foto']) && $_FILES['foto']['error'] !== UPLOAD_ERR_NO_FILE) {
    $f = $_FILES['foto'];

    if ($f['error'] !== UPLOAD_ERR_OK) {
        fallar('No se pudo subir la foto. Intenta con otra.');
    }
    if ($f['size'] > 5 * 1024 * 1024) {
        fallar('La foto pesa más de 5 MB.');
    }

    $info = @getimagesize($f['tmp_name']);
    $permitidos = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_GIF];
    if (defined('IMAGETYPE_WEBP')) {
        $permitidos[] = IMAGETYPE_WEBP;
    }
    if (!$info || !in_array($info[2], $permitidos, true)) {
        fallar('El archivo no es una imagen válida.');
    }

    preparar_carpeta($dir);

    $guardada = false;
    if (function_exists('imagecreatefromstring') && function_exists('imagejpeg')) {
        $img = @imagecreatefromstring(file_get_contents($f['tmp_name']));
        if ($img) {
            $w = imagesx($img);
            $h = imagesy($img);
            $lado = min($w, $h);
            $nueva = imagecreatetruecolor(256, 256);
            imagefill($nueva, 0, 0, imagecolorallocate($nueva, 255, 255, 255));
            imagecopyresampled($nueva, $img, 0, 0, intdiv($w - $lado, 2), intdiv($h - $lado, 2), 256, 256, $lado, $lado);
            $guardada = imagejpeg($nueva, $destino, 85);
            imagedestroy($img);
            imagedestroy($nueva);
        }
    }

    if (!$guardada && $info[2] === IMAGETYPE_JPEG) {
        $guardada = move_uploaded_file($f['tmp_name'], $destino);
    }

    if (!$guardada) {
        fallar('El servidor no pudo procesar esa imagen. Prueba con una JPG.', 500);
    }

    ejecutar($conexion, "UPDATE {$tabla} SET {$p}_foto = ? WHERE {$p}_codigo = ?", 'si', [$ruta, $codigo]);
}

responder(['ok' => true, 'usuario' => cargar_usuario($conexion, $rol, $codigo)]);
