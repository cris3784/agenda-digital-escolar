<?php
/* =========================================================
   GUARDAR EL PERFIL
   Qué hace: Cambia el nombre, los apellidos, la fecha de nacimiento y la foto de la cuenta que tiene la sesión.
   Por qué: Es lo que usa cada persona desde Mi perfil; solo puede cambiar sus propios datos.
   ========================================================= */

/* ---------- Cargar las herramientas, exigir POST y sesión ----------
   Qué hace: Trae util.php, acepta solo POST y pide sesión iniciada.
   Por qué: Nadie puede cambiar un perfil sin identificarse. */
require __DIR__ . '/util.php';
solo_post();
exigir_sesion();

/* ---------- ¿De quién es el perfil? ----------
   Qué hace: Toma el rol y el código de la sesión y busca la tabla y el prefijo de columnas de ese rol.
   Por qué: Se edita siempre la cuenta propia, nunca la de otra persona. */
$rol = $_SESSION['rol'];
$codigo = (int)$_SESSION['codigo'];
list($tabla, $p) = ROLES[$rol];

/* ---------- Leer lo que mandó la página ----------
   Qué hace: Toma el nombre, los apellidos y la fecha de nacimiento, y anota cuáles de esos campos vinieron en la petición.
   Por qué: Solo se cambia lo que la página envió; lo demás se deja como está. Esta página envía un formulario con archivo, por eso se lee de $_POST y no del JSON. */
$nombre    = trim((string)($_POST['nombre'] ?? ''));
$tieneApe  = array_key_exists('apellidos', $_POST);
$apellidos = trim((string)($_POST['apellidos'] ?? ''));
$tieneNac  = array_key_exists('nacimiento', $_POST);
$nacim     = validar_nacimiento(trim((string)($_POST['nacimiento'] ?? '')));

/* ---------- Guardar el nombre ----------
   Qué hace: Si escribió un nombre, comprueba que tenga entre 2 y 100 letras y lo guarda.
   Por qué: Evita nombres vacíos o demasiado largos. */
if ($nombre !== '') {
    if (largo($nombre) < 2 || largo($nombre) > 100) {
        fallar('Escribe tu nombre.');
    }
    if (!ejecutar($conexion, "UPDATE {$tabla} SET {$p}_nombre = ? WHERE {$p}_codigo = ?", 'si', [$nombre, $codigo])) {
        fallar('No se pudo guardar el nombre.', 500);
    }
}

/* ---------- Guardar los apellidos ----------
   Qué hace: Si vinieron apellidos, comprueba que no sean demasiado largos y los guarda.
   Por qué: Los apellidos son opcionales, pero tienen un límite de tamaño. */
if ($tieneApe) {
    validar_apellidos($apellidos);
    if (!ejecutar($conexion, "UPDATE {$tabla} SET {$p}_apellidos = ? WHERE {$p}_codigo = ?", 'si', [$apellidos, $codigo])) {
        fallar('No se pudieron guardar los apellidos.', 500);
    }
}

/* ---------- Guardar la fecha de nacimiento ----------
   Qué hace: Si vino la fecha (ya revisada arriba), la guarda; si se dejó vacía, queda sin fecha.
   Por qué: La fecha también es opcional. */
if ($tieneNac) {
    if (!ejecutar($conexion, "UPDATE {$tabla} SET {$p}_nacimiento = ? WHERE {$p}_codigo = ?", 'si', [$nacim, $codigo])) {
        fallar('No se pudo guardar la fecha de nacimiento.', 500);
    }
}

/* ---------- Dónde se guarda la foto ----------
   Qué hace: Arma la carpeta, la ruta completa y la ruta corta de la foto (por ejemplo est_12.jpg).
   Por qué: Cada cuenta tiene un solo archivo de foto; en la base de datos solo se guarda la ruta corta. */
$dir = dirname(__DIR__) . '/uploads/fotos';
$destino = $dir . '/' . $p . '_' . $codigo . '.jpg';
$ruta = 'uploads/fotos/' . $p . '_' . $codigo . '.jpg';

/* ---------- Quitar o cambiar la foto ----------
   Qué hace: Si la persona pidió quitar la foto, borra el archivo y limpia la ruta. Si subió una foto nueva, revisa que se haya subido bien, que pese máximo 5 MB y que sea una imagen real (JPG, PNG, GIF o WEBP).
   Por qué: Nunca se debe guardar un archivo que no sea una imagen. */
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

    /* ---------- Convertir la foto ----------
       Qué hace: Recorta la imagen en cuadrado desde el centro, la reduce a 256 x 256 y la guarda como JPG. Si el servidor no puede procesarla pero ya es JPG, la guarda tal cual.
       Por qué: Así todas las fotos tienen el mismo tamaño y pesan poco. */
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

/* ---------- Responder ----------
   Qué hace: Manda los datos actualizados de la persona en formato JSON.
   Por qué: La página los usa para refrescar el perfil sin recargar. */
responder(['ok' => true, 'usuario' => cargar_usuario($conexion, $rol, $codigo)]);