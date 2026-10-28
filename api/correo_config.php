<?php
/* =========================================================
   DATOS PARA ENVIAR CORREOS
   Qué hace: Guarda los datos para mandar correos con Brevo: la clave de acceso, el correo remitente y su nombre.
   Por qué: Los datos están juntos en un archivo para cambiarlos fácil sin tocar el resto del código.
   IMPORTANTE: BREVO_CLAVE es secreta. No la subas a GitHub ni la compartas.
   (En esta copia comentada la clave está cambiada por texto de relleno: conserva la tuya.)
   ========================================================= */

/* ---------- Clave de Brevo ----------
   Qué hace: Es la clave que permite usar la cuenta de Brevo para enviar correos.
   Por qué: Si alguien la consigue, puede mandar correos como si fueran de A.D.E. */
const BREVO_CLAVE = 'PON_AQUI_LA_CLAVE';

/* ---------- Correo remitente ----------
   Qué hace: El correo desde el que se envían los mensajes.
   Por qué: Debe estar confirmado en Brevo. */
const CORREO_REMITENTE = 'adeagendaescolardigital@gmail.com';

/* ---------- Nombre del remitente ----------
   Qué hace: El nombre que se ve como quien envía. */
const NOMBRE_REMITENTE = 'A.D.E. Agenda Digital Escolar';

/* ---------- Correo de prueba ----------
   Qué hace: Un correo para hacer pruebas de envío. */
const CORREO_PRUEBA = 'adeagendaescolardigital@gmail.com';