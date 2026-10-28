<?php
/* =========================================================
   ¿HAY UNA SESIÓN ACTIVA?
   Qué hace: Dice si la persona sigue con la sesión iniciada y, si es así, devuelve sus datos.
   Por qué: La página lo pregunta al abrirse para saber si mostrar el inicio de sesión o el panel de la persona.
   ========================================================= */

/* ---------- Cargar las herramientas comunes ----------
   Qué hace: Trae util.php (base de datos, sesión y funciones como cargar_usuario() y responder()).
   Por qué: Así no se repite ese código en cada archivo. */
require __DIR__ . '/util.php';

/* ---------- Sin sesión ----------
   Qué hace: Si la sesión no tiene rol y código, responde que no hay sesión.
   Por qué: Significa que la persona no ha iniciado sesión. */
if (empty($_SESSION['rol']) || empty($_SESSION['codigo'])) {
    responder(['ok' => false]);
}

/* ---------- Cargar los datos de la cuenta ----------
   Qué hace: Busca en la base de datos a la persona dueña de la sesión.
   Por qué: Así los datos siempre están al día. */
$u = cargar_usuario($conexion, $_SESSION['rol'], (int)$_SESSION['codigo']);

/* ---------- Cuenta que ya no sirve ----------
   Qué hace: Si la cuenta ya no existe, o es un profesor que dejó de estar aprobado, cierra la sesión y responde que no hay sesión.
   Por qué: Una cuenta borrada o sin aprobación no debe seguir entrando con una sesión vieja. */
// Si la cuenta ya no existe, o es un profesor que dejó de estar aprobado, se cierra la sesión
if (!$u || !cuenta_activa($u)) {
    $_SESSION = [];
    session_destroy();
    responder(['ok' => false]);
}

/* ---------- Responder ----------
   Qué hace: Manda los datos de la persona en formato JSON.
   Por qué: Es lo que lee el JavaScript de la página. */
responder(['ok' => true, 'usuario' => $u]);