<?php
require __DIR__ . '/util.php';
solo_post();
exigir_admin();

$d = entrada();
$accion = (string)($d['accion'] ?? '');
$actual = trim((string)($d['actual'] ?? ''));
$nombre = trim((string)($d['nombre'] ?? ''));

if ($accion !== 'agregar' && $accion !== 'editar' && $accion !== 'borrar') {
    fallar('Acción no válida.');
}
if ($accion !== 'borrar' && (largo($nombre) < 2 || largo($nombre) > 60)) {
    fallar('El nombre de la materia debe tener entre 2 y 60 letras.');
}

if ($accion === 'agregar') {
    $s = $conexion->prepare('INSERT INTO materias (mat_nombre) VALUES (?)');
    $s->bind_param('s', $nombre);
} elseif ($accion === 'editar') {
    $s = $conexion->prepare('UPDATE materias SET mat_nombre = ? WHERE mat_nombre = ?');
    $s->bind_param('ss', $nombre, $actual);
} else {
    $s = $conexion->prepare('DELETE FROM materias WHERE mat_nombre = ?');
    $s->bind_param('s', $actual);
}

if (!$s->execute()) {
    $errno = $conexion->errno;
    if ($errno === 1062) {
        fallar('Esa materia ya existe.', 409);
    }
    if ($errno === 1451) {
        fallar('No se puede borrar: hay profesores, horarios o actividades que usan esta materia.', 409);
    }
    fallar('No se pudo guardar la materia.', 500);
}

responder(['ok' => true]);
