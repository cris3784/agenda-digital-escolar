<?php
require __DIR__ . '/conexion.php';

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const ROLES = [
    'admin'      => ['administradores', 'adm'],
    'profesor'   => ['profesores', 'pro'],
    'estudiante' => ['estudiantes', 'est'],
    'acudiente'  => ['acudientes', 'acu']
];

function responder($datos, $codigo = 200) {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function fallar($mensaje, $codigo = 400) {
    responder(['ok' => false, 'error' => $mensaje], $codigo);
}

function solo_post() {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        fallar('Metodo no permitido.', 405);
    }
}

function entrada() {
    $datos = json_decode(file_get_contents('php://input'), true);
    return is_array($datos) ? $datos : [];
}

function exigir_sesion() {
    if (empty($_SESSION['rol']) || empty($_SESSION['codigo'])) {
        fallar('Debes iniciar sesion.', 401);
    }
}

function exigir_admin() {
    exigir_sesion();
    if ($_SESSION['rol'] !== 'admin') {
        fallar('No tienes permiso para hacer esto.', 403);
    }
}

function largo($texto) {
    return function_exists('mb_strlen') ? mb_strlen($texto, 'UTF-8') : strlen($texto);
}

function filas($conexion, $sql, $tipos = '', $params = []) {
    $s = $conexion->prepare($sql);
    if (!$s) {
        return [];
    }
    if ($tipos !== '') {
        $s->bind_param($tipos, ...$params);
    }
    if (!$s->execute()) {
        $s->close();
        return [];
    }
    $meta = $s->result_metadata();
    if (!$meta) {
        $s->close();
        return [];
    }
    $fila = [];
    $refs = [];
    foreach ($meta->fetch_fields() as $campo) {
        $refs[] = &$fila[$campo->name];
    }
    $s->bind_result(...$refs);
    $salida = [];
    while ($s->fetch()) {
        $copia = [];
        foreach ($fila as $clave => $valor) {
            $copia[$clave] = $valor;
        }
        $salida[] = $copia;
    }
    $s->close();
    return $salida;
}

// Estudiantes que ya verificaron este correo como el de su acudiente.
// Si el acudiente eligió un grado al registrarse, los hijos de ese grado van primero.
function hijos_de_acudiente($conexion, $correo, $gradoElegido = '') {
    $f = filas(
        $conexion,
        'SELECT est_codigo AS codigo, est_nombre AS nombre, est_apellidos AS apellidos, est_usuario AS usuario, est_gru_grupo AS grupo FROM estudiantes WHERE est_acu_correo = ? AND est_acu_verificado = 1 ORDER BY est_gru_grupo, est_codigo',
        's',
        [$correo]
    );
    $primeros = [];
    $otros = [];
    foreach ($f as $x) {
        $h = [
            'code'     => (int)$x['codigo'],
            'name'     => trim($x['nombre'] . ' ' . $x['apellidos']),
            'username' => $x['usuario'],
            'grade'    => $x['grupo']
        ];
        if ($gradoElegido !== '' && $x['grupo'] === $gradoElegido) {
            $primeros[] = $h;
        } else {
            $otros[] = $h;
        }
    }
    return array_merge($primeros, $otros);
}

function cargar_usuario($conexion, $rol, $codigo) {
    if (!isset(ROLES[$rol])) {
        return null;
    }
    list($tabla, $p) = ROLES[$rol];

    $extra = $rol === 'estudiante' ? ', est_gru_grupo AS grupo' : ($rol === 'acudiente' ? ', acu_gru_grupo AS grupo' : '');
    $f = filas(
        $conexion,
        "SELECT {$p}_codigo AS codigo, {$p}_nombre AS nombre, {$p}_apellidos AS apellidos, {$p}_nacimiento AS nacimiento, {$p}_usuario AS usuario, {$p}_correo AS correo, {$p}_creado AS creado, {$p}_foto AS foto{$extra} FROM {$tabla} WHERE {$p}_codigo = ?",
        'i',
        [$codigo]
    );
    if (!$f) {
        return null;
    }
    $f = $f[0];

    $foto = '';
    if (!empty($f['foto'])) {
        $archivoFoto = dirname(__DIR__) . '/' . $f['foto'];
        if (is_file($archivoFoto)) {
            $foto = 'api/foto.php?u=' . $p . $f['codigo'] . '&v=' . filemtime($archivoFoto);
        }
    }

    $u = [
        'id'        => $p . $f['codigo'],
        'codigo'    => (int)$f['codigo'],
        'name'      => trim($f['nombre'] . ' ' . $f['apellidos']),
        'firstName' => $f['nombre'],
        'lastName'  => (string)$f['apellidos'],
        'birthdate' => $f['nacimiento'] ? (string)$f['nacimiento'] : '',
        'username'  => $f['usuario'],
        'email'     => $f['correo'],
        'role'      => $rol,
        'grade'     => '',
        'photo'     => $foto,
        'createdAt' => date('d/m/Y, g:i:s a', strtotime($f['creado']))
    ];

    if ($rol === 'estudiante') {
        $u['grade'] = $f['grupo'];

        // Correo del acudiente (se lee aparte: si falta la columna, el ingreso no se rompe)
        $g = filas($conexion, 'SELECT est_acu_correo AS correo, est_acu_verificado AS ver FROM estudiantes WHERE est_codigo = ?', 'i', [$codigo]);
        $u['guardianEmail']    = ($g && $g[0]['correo'] !== null) ? (string)$g[0]['correo'] : '';
        $u['guardianVerified'] = $g ? !empty($g[0]['ver']) : false;
    }

    if ($rol === 'acudiente') {
        // Solo queda validado cuando un estudiante escribió su correo y lo verificó con el código
        $hijos = hijos_de_acudiente($conexion, (string)$f['correo'], (string)$f['grupo']);
        $u['pendingGrade'] = (string)$f['grupo'];
        $u['validated']    = count($hijos) > 0;
        $u['children']     = $hijos;
        $u['grade']        = $hijos ? $hijos[0]['grade'] : '';
        $grupos = [];
        foreach ($hijos as $h) {
            if (!in_array($h['grade'], $grupos, true)) {
                $grupos[] = $h['grade'];
            }
        }
        $u['groups'] = $grupos;
    }

    if ($rol === 'profesor') {
        $as = filas(
            $conexion,
            'SELECT m.mat_nombre AS materia, a.asi_gru_grupo AS grupo FROM asignaciones a JOIN materias m ON m.mat_codigo = a.asi_mat_materia WHERE a.asi_pro_profesor = ? ORDER BY a.asi_codigo',
            'i',
            [$codigo]
        );
        $materias = [];
        $grupos = [];
        foreach ($as as $a) {
            if (!in_array($a['materia'], $materias, true)) {
                $materias[] = $a['materia'];
            }
            if ($a['grupo'] !== null && !in_array($a['grupo'], $grupos, true)) {
                $grupos[] = $a['grupo'];
            }
        }
        $u['subject']  = $materias[0] ?? '';
        $u['subjects'] = $materias;
        if ($grupos) {
            $u['groups'] = $grupos;
            $u['grade']  = $grupos[0];
        }
    }

    return $u;
}


/* ---------------------------------------------------------
   Funciones que usan los demás archivos de la carpeta api
   --------------------------------------------------------- */

// Ejecuta un INSERT / UPDATE / DELETE con parámetros. Devuelve true si salió bien.
function ejecutar($conexion, $sql, $tipos = '', $params = []) {
    $s = $conexion->prepare($sql);
    if (!$s) {
        return false;
    }
    if ($tipos !== '') {
        $s->bind_param($tipos, ...$params);
    }
    $ok = $s->execute();
    $s->close();
    return $ok;
}

function preparar_carpeta($dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

// Limpia una lista de textos: sin espacios, sin vacíos y sin repetidos
function lista_texto($valor) {
    if (!is_array($valor)) {
        return [];
    }
    $limpia = [];
    foreach ($valor as $v) {
        $v = trim((string)$v);
        if ($v !== '' && !in_array($v, $limpia, true)) {
            $limpia[] = $v;
        }
    }
    return $limpia;
}

function validar_datos_basicos($nombre, $usuario, $correo) {
    if (largo($nombre) < 2 || largo($nombre) > 100) {
        fallar('Escribe el nombre completo.');
    }
    if (!preg_match('/^[A-Za-z0-9._-]{3,40}$/', $usuario)) {
        fallar('El usuario debe tener de 3 a 40 caracteres: letras, números, punto, guion o guion bajo, sin espacios ni tildes.');
    }
    if (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 120) {
        fallar('Escribe un correo válido (ej. nombre@gmail.com).');
    }
}

// ¿Otra cuenta (de cualquier tipo) ya usa ese usuario o correo?
// $rolPropio y $codigoPropio son la cuenta que se está editando (para no contarla).
function ya_existe_otro($conexion, $campo, $valor, $rolPropio, $codigoPropio) {
    foreach (ROLES as $rol => $info) {
        list($tabla, $p) = $info;
        $f = filas($conexion, "SELECT {$p}_codigo AS codigo FROM {$tabla} WHERE {$p}_{$campo} = ?", 's', [$valor]);
        foreach ($f as $fila) {
            if ($rol === $rolPropio && (int)$fila['codigo'] === (int)$codigoPropio) {
                continue;
            }
            return true;
        }
    }
    return false;
}

// Nombres de materias -> códigos (si alguna no existe, se avisa)
function codigos_de_materias($conexion, $nombres) {
    $codigos = [];
    foreach ($nombres as $m) {
        $f = filas($conexion, 'SELECT mat_codigo FROM materias WHERE mat_nombre = ? LIMIT 1', 's', [$m]);
        if (!$f) {
            fallar('La materia "' . $m . '" no existe.');
        }
        $codigos[(int)$f[0]['mat_codigo']] = true;
    }
    return array_keys($codigos);
}

// Grupos del profesor. Vacío = sin límite de grupo (así lo explica el editor del administrador).
function validar_grupos($conexion, $grupos) {
    if (count($grupos) > 54) {
        fallar('Hay demasiados grupos.');
    }
    foreach ($grupos as $g) {
        if (!filas($conexion, 'SELECT gru_codigo FROM grupos WHERE gru_codigo = ?', 's', [$g])) {
            fallar('El grupo "' . $g . '" no existe. Usa el formato 6-1.');
        }
    }
}

// Reemplaza todas las asignaciones (materia + grupo) de un profesor
function guardar_asignaciones($conexion, $profesor, $codMaterias, $grupos) {
    if (!ejecutar($conexion, 'DELETE FROM asignaciones WHERE asi_pro_profesor = ?', 'i', [$profesor])) {
        return false;
    }
    $a = $conexion->prepare('INSERT INTO asignaciones (asi_pro_profesor, asi_mat_materia, asi_gru_grupo) VALUES (?, ?, ?)');
    if (!$a) {
        return false;
    }
    $lista = $grupos ? $grupos : [null];
    foreach ($codMaterias as $mc) {
        foreach ($lista as $g) {
            $a->bind_param('iis', $profesor, $mc, $g);
            if (!$a->execute()) {
                $a->close();
                return false;
            }
        }
    }
    $a->close();
    return true;
}

// Apellidos (opcional) y fecha de nacimiento (opcional, AAAA-MM-DD). Si algo está mal, avisa y corta.
function validar_apellidos($apellidos) {
    if (largo($apellidos) > 100) {
        fallar('Los apellidos son demasiado largos.');
    }
}

function validar_nacimiento($nacimiento) {
    if ($nacimiento === '') {
        return null;
    }
    $d = DateTime::createFromFormat('Y-m-d', $nacimiento);
    $ok = $d && $d->format('Y-m-d') === $nacimiento;
    if (!$ok || $nacimiento > date('Y-m-d') || $nacimiento < '1900-01-01') {
        fallar('La fecha de nacimiento no es válida.');
    }
    return $nacimiento;
}

// Para el administrador: todas las cuentas
function listar_todos($conexion) {
    $salida = [];
    foreach (ROLES as $rol => $info) {
        list($tabla, $p) = $info;
        $f = filas($conexion, "SELECT {$p}_codigo AS codigo FROM {$tabla} ORDER BY {$p}_codigo");
        foreach ($f as $fila) {
            $u = cargar_usuario($conexion, $rol, (int)$fila['codigo']);
            if ($u) {
                $salida[] = $u;
            }
        }
    }
    return $salida;
}

// Para un profesor: los estudiantes de los grupos que atiende (sin grupos = todos)
function listar_estudiantes_de_profesor($conexion, $yo) {
    $grupos = isset($yo['groups']) ? $yo['groups'] : [];
    if ($grupos) {
        $marcas = implode(',', array_fill(0, count($grupos), '?'));
        $f = filas(
            $conexion,
            "SELECT est_codigo AS codigo FROM estudiantes WHERE est_gru_grupo IN ($marcas) ORDER BY est_codigo",
            str_repeat('s', count($grupos)),
            $grupos
        );
    } else {
        $f = filas($conexion, 'SELECT est_codigo AS codigo FROM estudiantes ORDER BY est_codigo');
    }
    $salida = [];
    foreach ($f as $fila) {
        $u = cargar_usuario($conexion, 'estudiante', (int)$fila['codigo']);
        if ($u) {
            $salida[] = $u;
        }
    }
    return $salida;
}

// Para un estudiante: los profesores que atienden su grupo
function listar_profesores_de_grupo($conexion, $grupo) {
    $f = filas(
        $conexion,
        'SELECT DISTINCT asi_pro_profesor AS codigo FROM asignaciones WHERE asi_gru_grupo = ? OR asi_gru_grupo IS NULL',
        's',
        [$grupo]
    );
    $salida = [];
    foreach ($f as $fila) {
        $u = cargar_usuario($conexion, 'profesor', (int)$fila['codigo']);
        if ($u) {
            $salida[] = $u;
        }
    }
    return $salida;
}