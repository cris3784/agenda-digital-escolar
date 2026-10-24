/* =========================================================
   DATOS DE PRUEBA — cuentas, horarios, actividades y calendario
   (grados 6.º a 11.º)

   ► CÓMO USARLO: agrega esta línea en tu HTML como el PRIMER <script>
     (antes de permisos.js):
         <script src="datos-prueba.js"></script>

   Qué hace ahora (solo una vez por versión):
     • Ya NO crea cuentas ni actividades de prueba, y borra las que haya dejado antes.
     • Deja un horario distinto para cada grupo, sin cruces de materias ni de profesores
     • Deja eventos de ejemplo en el calendario (octubre a diciembre de 2026)

   Para cambiar la cantidad de grupos: GROUPS_PER_GRADE (9 => 7-1 … 7-9)
   y sube el número de SEED_VERSION para que se vuelva a generar.

   Solo toca lo suyo: las cuentas/actividades/eventos creados aquí llevan
   la marca "seed" y se reemplazan al regenerar; tus cuentas y actividades
   reales no se tocan (si un usuario o correo ya existe, se respeta el tuyo).
   ========================================================= */
(function(){

  "use strict";

  const SEED_VERSION = "2026-10-21.limpio";   // súbelo (p. ej. .4) para regenerar
  const SEED_TAG = "ade-prueba";
  const GROUPS_PER_GRADE = 9;            // 9 => 6-1 … 6-9, 7-1 … 7-9 … 11-1 … 11-9
  const GRADES = [6, 7, 8, 9, 10, 11];


  /* ---------------------------------------------------------
     PLAN DE ESTUDIOS: materias, horas por semana y profesores
     que dictan dos materias (siempre las dos en el mismo grupo)
     --------------------------------------------------------- */

  // Básica (6.º a 9.º): 30 horas por semana
  const HOURS_BASICA = {
    "Matemáticas":4, "Castellano":4, "Inglés":3, "Naturales":3, "Sociales":3,
    "Educación Física":2, "Artística":2, "Tecnología":2, "Ética":2, "Religión":2,
    "Emprendimiento":3
  };

  // Media (10.º y 11.º): 30 horas por semana
  const HOURS_MEDIA = {
    "Matemáticas":4, "Castellano":3, "Inglés":3, "Física":3, "Química":3,
    "Filosofía":2, "Economía":2, "Sociales":2, "Educación Física":2, "Artística":1,
    "Tecnología":2, "Ética":1, "Religión":1, "Emprendimiento":1
  };

  // Un mismo profesor dicta ambas materias de la pareja (misma área, carga lógica)
  const MERGES_BASICA = [["Ética","Religión"], ["Tecnología","Emprendimiento"]];
  const MERGES_MEDIA  = [["Ética","Religión"], ["Tecnología","Emprendimiento"], ["Filosofía","Economía"]];

  const DAYS = ["Lunes","Martes","Miércoles","Jueves","Viernes"];

  // 6 horas de clase por día (el descanso 8:37 - 9:07 lo dibuja horario.js)
  const PERIODS = ["6:00 - 6:52","6:52 - 7:45","7:45 - 8:37","9:07 - 10:00","10:00 - 10:52","10:52 - 11:45"];

  // Las materias más "pesadas" tienden a quedar temprano, las prácticas al final
  const EARLY = {
    "Matemáticas":0, "Castellano":0, "Inglés":1, "Física":1, "Química":1, "Naturales":1,
    "Filosofía":2, "Sociales":2, "Economía":2, "Tecnología":3, "Emprendimiento":3,
    "Ética":3, "Religión":3, "Artística":4, "Educación Física":5
  };

  const isBasica = grade => grade <= 9;
  const hoursOf = grade => isBasica(grade) ? HOURS_BASICA : HOURS_MEDIA;
  const mergesOf = grade => isBasica(grade) ? MERGES_BASICA : MERGES_MEDIA;
  const subjectsOfGrade = grade => Object.keys(hoursOf(Number(grade)));

  const gradeOfGroup = group => parseInt(String(group).split("-")[0], 10);
  const numOfGroup = group => parseInt(String(group).split("-")[1], 10);

  const ALL_GROUPS = [];
  GRADES.forEach(g => { for(let n = 1; n <= GROUPS_PER_GRADE; n++) ALL_GROUPS.push(g + "-" + n); });

  function slug(text){
    return String(text).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function listText(items){
    return items.length < 2 ? items.join("") : items.slice(0, -1).join(", ") + " y " + items[items.length - 1];
  }


  /* ---------------------------------------------------------
     Números "al azar" repetibles (el resultado es siempre el mismo)
     --------------------------------------------------------- */
  function hash(str){
    let h = 2166136261;
    for(let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }


  /* ---------------------------------------------------------
     CUENTAS
     --------------------------------------------------------- */

  function teachersOfGroup(group){

    const grade = gradeOfGroup(group);
    const num = numOfGroup(group);
    const used = new Set();
    const out = [];

    subjectsOfGrade(grade).forEach(subject => {

      if(used.has(subject)) return;

      const pair = mergesOf(grade).find(p => p[0] === subject);
      const subjects = pair ? pair.slice() : [subject];
      subjects.forEach(s => used.add(s));

      const username = "pro" + slug(subjects[0]) + grade + num;

      out.push({
        id: "t-" + username,
        name: "Prof. " + listText(subjects) + " " + group,
        username: username,
        email: username + "@gmail.com",
        password: username,
        grade: group,                 // grupo principal (el sistema lo usa en el perfil)
        role: "profesor",
        subject: subjects[0],         // materia principal (compatibilidad)
        subjects: subjects,           // todas las materias que dicta
        groups: [group],              // grupos que atiende
        seed: SEED_TAG
      });
    });

    return out;
  }

  function studentOfGroup(group){
    const username = "estudiante" + group.replace("-", "");
    return {
      id: "e-" + username,
      name: "Estudiante " + group + " (prueba)",
      username: username,
      email: username + "@gmail.com",
      password: username,
      grade: group,
      role: "estudiante",
      seed: SEED_TAG
    };
  }


  /* ---------------------------------------------------------
     HORARIOS (uno distinto por grupo)
     --------------------------------------------------------- */

  function buildGroupSchedule(group, salt, teacherBySubject){

    const grade = gradeOfGroup(group);
    const hours = hoursOf(grade);
    const rnd = mulberry32(hash(group) + salt * 7919);

    const days = [[], [], [], [], []];

    // Las materias con más horas primero; cada materia va en los días menos cargados
    // y nunca dos veces el mismo día => todos los días quedan con 6 horas.
    Object.keys(hours)
      .map(s => ({s: s, k: -hours[s] + rnd() * 0.5}))
      .sort((a, b) => a.k - b.k)
      .forEach(item => {
        const order = [0, 1, 2, 3, 4]
          .map(d => ({d: d, k: days[d].length + rnd() * 0.9}))
          .sort((a, b) => a.k - b.k)
          .map(x => x.d);
        order.slice(0, hours[item.s]).forEach(d => days[d].push(item.s));
      });

    const result = days.map((subjects, di) => {
      const ordered = subjects
        .map(s => ({s: s, k: EARLY[s] + rnd() * 2.2}))
        .sort((a, b) => a.k - b.k)
        .map(x => x.s);
      return {
        day: DAYS[di],
        classes: ordered.map((subject, i) => ({
          subject: subject,
          time: PERIODS[i],
          room: "Salón " + group,
          teacher: teacherBySubject[subject].username,
          teacherName: teacherBySubject[subject].name
        }))
      };
    });

    return result;
  }

  function fingerprint(schedule){
    return schedule.map(d => d.classes.map(c => c.subject).join(",")).join("|");
  }


  /* ---------------------------------------------------------
     ACTIVIDADES
     --------------------------------------------------------- */

  const TOPICS = {
    "Matemáticas": {
      6:["Fracciones y decimales","Múltiplos y divisores","Perímetro y área"],
      7:["Números enteros","Razones y proporciones","Ángulos y triángulos"],
      8:["Ecuaciones lineales","Potenciación y radicación","Teorema de Pitágoras"],
      9:["Funciones lineales","Sistemas de ecuaciones","Probabilidad básica"],
      10:["Funciones cuadráticas","Trigonometría básica","Estadística descriptiva"],
      11:["Límites de funciones","Introducción a la derivada","Geometría analítica"]
    },
    "Castellano": {
      6:["El cuento y sus partes","Sustantivos y adjetivos","Lectura comprensiva"],
      7:["La leyenda","Tipos de oraciones","Textos narrativos"],
      8:["La poesía y sus figuras literarias","La noticia y la crónica","Ortografía y puntuación"],
      9:["El ensayo","Textos argumentativos","Literatura latinoamericana"],
      10:["La novela y sus géneros","El texto expositivo","Análisis de un texto literario"],
      11:["Ensayo argumentativo","Lectura crítica (preparación Saber 11)","Literatura colombiana contemporánea"]
    },
    "Inglés": {
      6:["Verb to be","Family vocabulary","Present simple"],
      7:["Daily routines","Present continuous","There is / There are"],
      8:["Past simple","Comparatives and superlatives","A short story"],
      9:["Future with will and going to","Modal verbs","Writing an email"],
      10:["Present perfect","Conditionals","Listening comprehension"],
      11:["Reported speech","Saber 11 practice","An opinion essay"]
    },
    "Naturales": {
      6:["Los seres vivos y su clasificación","La célula","Estados de la materia"],
      7:["Ecosistemas y cadenas alimenticias","Sistemas del cuerpo humano","Mezclas y sustancias puras"],
      8:["Reproducción y herencia","La energía y sus transformaciones","La tabla periódica"],
      9:["Genética mendeliana","Fuerzas y movimiento","Reacciones químicas"]
    },
    "Sociales": {
      6:["Las civilizaciones antiguas","El mapa de Colombia","Los derechos de los niños"],
      7:["La Edad Media","Regiones naturales de Colombia","Mecanismos de participación"],
      8:["La Revolución Francesa","La Independencia de Colombia","Los derechos humanos"],
      9:["La Revolución Industrial","La Primera Guerra Mundial","La Constitución de 1991"],
      10:["La Guerra Fría","El conflicto armado en Colombia","La globalización"],
      11:["Geopolítica actual","Los Acuerdos de Paz","Sociales para Saber 11"]
    },
    "Educación Física": {
      6:["Capacidades físicas básicas","Juegos pre-deportivos","Calentamiento y estiramiento"],
      7:["Fundamentos del voleibol","Resistencia aeróbica","Hábitos de vida saludable"],
      8:["Fundamentos del baloncesto","Flexibilidad y fuerza","Primeros auxilios básicos"],
      9:["Fundamentos del fútbol de salón","Rutina de ejercicio","Reglamento deportivo"],
      10:["Condición física y salud","Organización de un torneo","Atletismo"],
      11:["Plan de entrenamiento personal","Recreación y tiempo libre","Prevención de lesiones"]
    },
    "Artística": {
      6:["Colores primarios y secundarios","Dibujo con líneas","Collage con material reciclado"],
      7:["Perspectiva y volumen","Teoría del color","Retrato en lápiz"],
      8:["Técnica de acuarela","El arte del Renacimiento","Diseño de un afiche"],
      9:["Arte moderno","Escultura con material reciclable","La fotografía como expresión"],
      10:["Arte colombiano","Proyecto de mural","Análisis de una obra de arte"],
      11:["Portafolio artístico","Arte contemporáneo","Diseño gráfico básico"]
    },
    "Tecnología": {
      6:["Partes del computador","Uso seguro de internet","Procesador de texto"],
      7:["Hojas de cálculo básicas","Presentaciones digitales","Inventos y su historia"],
      8:["Introducción a la programación","Diseño de un circuito simple","Ciudadanía digital"],
      9:["Programación en Scratch","Bases de datos sencillas","Energías y tecnología"],
      10:["Lógica de programación","Diseño web básico","Robótica introductoria"],
      11:["Proyecto de desarrollo web","Seguridad informática","Bases de datos aplicadas"]
    },
    "Ética": {
      6:["Los valores en el aula","El respeto a la diferencia","Normas de convivencia"],
      7:["La amistad y la responsabilidad","Resolución de conflictos","La honestidad"],
      8:["Toma de decisiones","El bullying y cómo prevenirlo","Dilemas éticos sencillos"],
      9:["Proyecto de vida","La ética y la ciudadanía","El perdón y la reconciliación"],
      10:["Ética y medios de comunicación","Responsabilidad social","Valores y trabajo en equipo"],
      11:["Ética profesional","Orientación del proyecto de vida","Ciudadanía y democracia"]
    },
    "Religión": {
      6:["Las religiones del mundo","El valor de la vida","La solidaridad"],
      7:["Personajes bíblicos","La familia como comunidad","El servicio a los demás"],
      8:["Los valores cristianos","La libertad y la responsabilidad","El diálogo entre creencias"],
      9:["El sentido de la vida","La justicia y la paz","Las religiones y la cultura"],
      10:["Fe y ciencia","El compromiso social","La dignidad de la persona"],
      11:["Proyecto de vida y espiritualidad","Religión y sociedad","Grandes dilemas morales"]
    },
    "Emprendimiento": {
      6:["Qué es emprender","Ahorro y gasto responsable","Mi idea de negocio"],
      7:["Necesidades y productos","Oferta y demanda","Mi primer presupuesto"],
      8:["Costos e ingresos","Publicidad y mercadeo","Plan de negocio simple"],
      9:["Estudio de mercado","Propuesta de valor","Presentación de un emprendimiento"],
      10:["Modelo de negocio Canvas","Finanzas personales","Análisis de la competencia"],
      11:["Plan de negocio completo","Pitch de emprendimiento","Legalización de una empresa"]
    },
    "Física": {
      10:["Movimiento rectilíneo","Leyes de Newton","Trabajo y energía"],
      11:["Ondas y sonido","Electricidad y circuitos","Óptica y luz"]
    },
    "Química": {
      10:["Tabla periódica y enlaces","Estequiometría básica","Soluciones y concentración"],
      11:["Química orgánica","Equilibrio químico","Ácidos y bases"]
    },
    "Filosofía": {
      10:["¿Qué es la filosofía?","Los filósofos presocráticos","Sócrates, Platón y Aristóteles"],
      11:["Descartes y la filosofía moderna","La ética de Kant","El existencialismo"]
    },
    "Economía": {
      10:["Conceptos básicos de economía","Oferta, demanda y precios","El Estado y la economía"],
      11:["Inflación y desempleo","Comercio internacional","Política y poder en Colombia"]
    }
  };

  const TYPES = {
    "Matemáticas":["Taller","Quiz","Guía","Problemas"],
    "Castellano":["Taller","Ensayo corto","Lectura","Informe"],
    "Inglés":["Worksheet","Quiz","Writing task","Speaking"],
    "Naturales":["Informe de laboratorio","Taller","Mapa conceptual","Quiz"],
    "Sociales":["Mapa conceptual","Línea de tiempo","Ensayo corto","Exposición"],
    "Educación Física":["Práctica","Informe","Rutina"],
    "Artística":["Trabajo práctico","Bitácora","Proyecto"],
    "Tecnología":["Práctica en computador","Proyecto","Guía","Quiz"],
    "Ética":["Reflexión","Mapa conceptual","Debate"],
    "Religión":["Reflexión","Mapa conceptual","Trabajo en grupo"],
    "Emprendimiento":["Proyecto","Informe","Exposición","Taller"],
    "Física":["Taller","Informe de laboratorio","Quiz","Problemas"],
    "Química":["Informe de laboratorio","Taller","Quiz","Guía"],
    "Filosofía":["Ensayo corto","Reflexión","Debate","Mapa conceptual"],
    "Economía":["Taller","Informe","Exposición","Quiz"]
  };

  const DESCRIPTIONS = {
    "Taller": "Resuelve el taller sobre {t} y entrégalo por la plataforma.",
    "Quiz": "Quiz corto sobre {t}. Repasa tus apuntes antes de la clase.",
    "Guía": "Desarrolla la guía de {t} y entrégala completa antes de la fecha límite.",
    "Problemas": "Resuelve los problemas propuestos sobre {t}. Muestra todo el procedimiento.",
    "Ensayo corto": "Redacta un ensayo corto (mínimo una página) sobre {t}.",
    "Lectura": "Lee el texto asignado sobre {t} y responde las preguntas de comprensión.",
    "Informe": "Escribe un informe de una página sobre {t} con tus propias palabras.",
    "Worksheet": "Complete the worksheet about {t} and upload it before the deadline.",
    "Writing task": "Write a short paragraph (80 words) about {t}.",
    "Speaking": "Prepare a short oral presentation about {t}.",
    "Informe de laboratorio": "Entrega el informe de laboratorio sobre {t}: objetivo, procedimiento y conclusiones.",
    "Mapa conceptual": "Elabora un mapa conceptual sobre {t} y súbelo a la plataforma.",
    "Línea de tiempo": "Construye una línea de tiempo sobre {t} con al menos 8 hechos importantes.",
    "Exposición": "Prepara una exposición de 5 minutos sobre {t}. Puedes apoyarte en carteles o diapositivas.",
    "Práctica": "Práctica en cancha sobre {t}. Trae ropa deportiva y botella de agua.",
    "Rutina": "Diseña y registra una rutina de ejercicio sobre {t}.",
    "Trabajo práctico": "Trabajo práctico sobre {t}. Trae los materiales indicados en clase.",
    "Bitácora": "Completa tu bitácora artística con el trabajo de {t}.",
    "Proyecto": "Avance del proyecto sobre {t}. Entrega lo que llevas hasta ahora.",
    "Práctica en computador": "Práctica en computador sobre {t}. Guarda tu archivo y súbelo.",
    "Reflexión": "Escribe una reflexión personal sobre {t} (mínimo 10 renglones).",
    "Debate": "Prepárate para el debate sobre {t}: lleva dos argumentos a favor y dos en contra.",
    "Trabajo en grupo": "Trabajo en grupo sobre {t}. Entrega un solo documento por grupo."
  };

  // Actividades de ejemplo que traía la página al principio (sin grupo)
  const ORIGINAL_TITLES = ["Taller de funciones","Proyecto de programación","Ensayo de filosofía","Actividad de inglés"];

  const HOLIDAYS = ["2026-11-02", "2026-11-16"];

  // Días de clase entre el 14 de octubre y el 27 de noviembre de 2026
  const SCHOOL_DAYS = (function(){
    const out = [];
    for(let d = new Date(Date.UTC(2026, 9, 14)); d <= new Date(Date.UTC(2026, 10, 27)); d.setUTCDate(d.getUTCDate() + 1)){
      const wd = d.getUTCDay();
      const key = d.toISOString().slice(0, 10);
      if(wd >= 1 && wd <= 5 && HOLIDAYS.indexOf(key) === -1) out.push(key);
    }
    return out;
  })();

  function lowerFirst(text){
    return text.charAt(0).toLowerCase() + text.slice(1);
  }

  function activitiesOfGroup(group){

    const grade = gradeOfGroup(group);
    const gnum = numOfGroup(group);
    const out = [];

    subjectsOfGrade(grade).forEach((subject, si) => {

      const topics = (TOPICS[subject] || {})[grade] || [];
      const types = TYPES[subject] || ["Taller", "Guía"];
      const titles = new Set();

      // 3 temas del grado + 1 quiz de repaso del tema que toca a este grupo
      const plan = topics.map((topic, i) => ({topic: topic, type: types[(i + gnum + si) % types.length]}));
      plan.push({topic: topics[gnum % Math.max(topics.length, 1)], type: "Quiz"});

      plan.forEach((item, ai) => {

        if(!item.topic) return;

        let type = item.type;
        let title = type + ": " + item.topic;
        if(titles.has(title)){ type = "Repaso"; title = "Repaso: " + item.topic; }
        titles.add(title);

        const template = DESCRIPTIONS[type] || "Repaso de {t}. Revisa tus apuntes y trae dudas a la clase.";
        const date = SCHOOL_DAYS[(si * 7 + ai * 11 + gnum * 5 + grade * 3) % SCHOOL_DAYS.length];

        out.push({
          title: title,
          subject: subject,
          group: group,
          date: date,
          desc: template.replace("{t}", lowerFirst(item.topic)),
          done: false,
          seed: SEED_TAG
        });
      });
    });

    return out;
  }


  /* ---------------------------------------------------------
     EVENTOS DEL CALENDARIO (ejemplos: el administrador los puede editar)
     --------------------------------------------------------- */

  const EVENTS = [
    ["2026-10-12","Día de la Raza (festivo)","Festivo nacional. No hay clases."],
    ["2026-10-19","Reunión de docentes","Reunión de docentes para revisar el avance académico y organizar las evaluaciones del cierre del año."],
    ["2026-10-21","Charla de orientación vocacional","Charla de orientación vocacional para los grados 10.º y 11.º en el auditorio."],
    ["2026-10-23","Entrega de trabajos pendientes","Último día para entregar por la plataforma los trabajos atrasados de todas las materias."],
    ["2026-10-26","Simulacro de Saber 11","Simulacro de la prueba Saber 11 para el grado 11.º. Traer lápiz, borrador y documento."],
    ["2026-10-27","Izada de bandera","Izada de bandera del colegio. Los estudiantes deben presentarse con el uniforme de gala."],
    ["2026-10-30","Jornada de integración","Jornada de integración con juegos y concursos para todos los grados."],
    ["2026-11-02","Todos los Santos (festivo)","Festivo nacional. No hay clases."],
    ["2026-11-04","Feria de la ciencia","Muestra de proyectos de Naturales, Física, Química y Tecnología. Abierta a las familias."],
    ["2026-11-06","Reunión de padres de familia","Reunión de padres de familia y entrega de informes parciales por grupo."],
    ["2026-11-10","Olimpiadas de matemáticas","Olimpiadas de matemáticas para los grados 6.º a 9.º. Inscripción con el profesor del área."],
    ["2026-11-12","English Day","Jornada cultural en inglés: obras cortas, canciones y exposiciones."],
    ["2026-11-13","Torneos interclases","Torneos deportivos interclases de fútbol de salón, baloncesto y voleibol."],
    ["2026-11-16","Independencia de Cartagena (festivo)","Festivo nacional. No hay clases."],
    ["2026-11-18","Entrega de trabajos finales","Entrega de trabajos finales de Tecnología y Artística."],
    ["2026-11-20","Feria de emprendimiento","Presentación de los proyectos de emprendimiento de todos los grados."],
    ["2026-11-24","Evaluaciones finales: Matemáticas y Castellano","Evaluaciones finales de Matemáticas y Castellano en la jornada de la mañana."],
    ["2026-11-26","Evaluaciones finales: Ciencias y Sociales","Evaluaciones finales de Naturales, Física, Química y Sociales."],
    ["2026-11-27","Cierre de actividades académicas","Último día de actividades académicas del año. Se recogen los trabajos pendientes."],
    ["2026-12-01","Comisión de evaluación y promoción","Reunión de la comisión de evaluación y promoción. No hay clases para estudiantes."],
    ["2026-12-03","Entrega de informes finales","Entrega de informes finales a los padres de familia, por grupos."],
    ["2026-12-04","Clausura del año escolar","Acto de clausura del año escolar y reconocimientos a los mejores estudiantes."],
    ["2026-12-08","Día de la Inmaculada Concepción (festivo)","Festivo nacional. No hay clases."],
    ["2026-12-11","Ceremonia de graduación","Ceremonia de graduación de los estudiantes de 11.º."],
    ["2026-12-25","Navidad (festivo)","Festivo nacional."]
  ];

  // Eventos que traía el calendario antes de este archivo
  const OLD_DEFAULT_EVENTS = {
    "2026-09-14":[{title:"Paro escolar general", desc:"Jornada de paro general. Se suspenden las actividades académicas del colegio durante este día."}],
    "2026-09-15":[{title:"Izada de bandera", desc:"Izada de bandera del colegio. Los estudiantes deben presentarse en el lugar indicado y participar en el acto cívico según las indicaciones de la institución."}],
    "2026-09-18":[{title:"Reunión de docentes", desc:"Reunión de docentes para revisar actividades, compromisos académicos y organización de la próxima semana."}],
    "2026-09-23":[{title:"Entrega de trabajos", desc:"Fecha de entrega de trabajos pendientes. Revisa las actividades de cada materia y realiza las entregas antes de finalizar la jornada."}],
    "2026-09-25":[{title:"Actividad institucional", desc:"Actividad institucional del colegio. Consulta las indicaciones comunicadas por los profesores y lleva los materiales solicitados."}]
  };


  /* ---------------------------------------------------------
     ARMAR TODO (sin tocar el navegador: se puede probar aparte)
     --------------------------------------------------------- */

  function build(){

    const users = [];
    const schedules = {};
    const activities = [];
    const fingerprints = new Set();

    ALL_GROUPS.forEach(group => {

      const teachers = teachersOfGroup(group);

      const teacherBySubject = {};
      teachers.forEach(t => t.subjects.forEach(s => { teacherBySubject[s] = t; }));

      // Si por casualidad sale igual a otro grupo, se vuelve a sortear
      let salt = 0;
      let schedule = buildGroupSchedule(group, salt, teacherBySubject);
      while(fingerprints.has(fingerprint(schedule)) && salt < 200){
        salt++;
        schedule = buildGroupSchedule(group, salt, teacherBySubject);
      }
      fingerprints.add(fingerprint(schedule));
      schedules[group] = schedule;

    });

    const events = {};
    EVENTS.forEach(e => {
      if(!events[e[0]]) events[e[0]] = [];
      events[e[0]].push({title: e[1], desc: e[2], seed: SEED_TAG});
    });

    return {users: users, schedules: schedules, activities: activities, events: events};
  }


  /* ---------------------------------------------------------
     GUARDAR EN EL NAVEGADOR (solo una vez por versión)
     --------------------------------------------------------- */

  function readJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  }

  // Cuentas de prueba de versiones anteriores (mismo estilo de nombre) se reemplazan,
  // para que quede exactamente una cuenta por profesor y un estudiante por grupo.
  const OLD_TEACHER = /^pro[a-z]+(6|7|8|9|10|11)[1-9]$/;
  const OLD_STUDENT = /^estudiante(6|7|8|9|10|11)[1-9]$/;

  function isOldTestAccount(u){
    if(!u || u.role === "admin") return false;
    if(u.seed === SEED_TAG) return true;
    const name = String(u.username || "").toLowerCase();
    return (u.role === "profesor" && OLD_TEACHER.test(name)) ||
           (u.role === "estudiante" && OLD_STUDENT.test(name));
  }

  function apply(){

    const data = build();
    const stamp = new Date().toLocaleString("es-CO");
    const problems = [];
    const step = (name, fn) => {
      try{ fn(); }catch(e){
        problems.push(name + ": " + (e && e.message ? e.message : e));
        if(typeof console !== "undefined") console.error("[datos-prueba] " + name, e);
      }
    };

    // --- Usuarios
    step("usuarios", () => {
      let users = readJSON("ade_users", []);
      if(!Array.isArray(users)) users = [];
      const before = users.length;
      users = users.filter(u => !isOldTestAccount(u));
      const removed = before - users.length;

      localStorage.setItem("ade_users", JSON.stringify(users));
      if(removed && typeof console !== "undefined") console.info("[datos-prueba] cuentas de prueba anteriores reemplazadas:", removed);
    });

    // --- Horarios por grupo (se reemplazan por completo: así no queda nada viejo)
    step("horarios", () => {
      localStorage.setItem("ade_schedules_v3", JSON.stringify(data.schedules));
    });

    // --- Actividades (se conservan las tuyas)
    step("actividades", () => {
      let activities = readJSON("ade_activities", []);
      if(!Array.isArray(activities)) activities = [];
      // Las 4 actividades de ejemplo originales (sin grupo) se quitan para que no se mezclen
      activities = activities.filter(a => !(a && (a.seed === SEED_TAG || (!a.group && !a.submissions && ORIGINAL_TITLES.indexOf(a.title) !== -1))));
      localStorage.setItem("ade_activities", JSON.stringify(activities));
    });

    // --- Calendario (se conservan los eventos que ya había)
    step("calendario", () => {
      let events = readJSON("ade_calendar_events", null);
      if(!events || typeof events !== "object" || Array.isArray(events)) events = JSON.parse(JSON.stringify(OLD_DEFAULT_EVENTS));
      Object.keys(events).forEach(k => {
        events[k] = (Array.isArray(events[k]) ? events[k] : []).filter(e => !(e && e.seed === SEED_TAG));
        if(!events[k].length) delete events[k];
      });
      Object.keys(data.events).forEach(k => {
        events[k] = (events[k] || []).concat(data.events[k]);
      });
      localStorage.setItem("ade_calendar_events", JSON.stringify(events));
    });

    if(problems.length){
      // No se marca como terminado: se vuelve a intentar al recargar
      if(typeof alert === "function"){
        setTimeout(() => alert("No se pudieron guardar todos los datos de prueba.\n\n" + problems.join("\n") +
          "\n\nSi dice 'quota' o 'exceeded', el navegador se quedó sin espacio: borra los datos del sitio y vuelve a abrir la página."), 300);
      }
      return;
    }

    localStorage.setItem("ade_seed_version", SEED_VERSION);
  }


  /* ---------------------------------------------------------
     Información que usan otros archivos (materias por grado/grupo)
     --------------------------------------------------------- */

  const api = {
    SEED_VERSION: SEED_VERSION,
    SEED_TAG: SEED_TAG,
    groups: ALL_GROUPS.slice(),
    days: DAYS.slice(),
    periods: PERIODS.slice(),
    hoursOfGrade: grade => Object.assign({}, hoursOf(Number(grade))),
    subjectsOfGrade: subjectsOfGrade,
    subjectsOfGroup: group => subjectsOfGrade(gradeOfGroup(group)),
    build: build,
    apply: apply
  };

  if(typeof window !== "undefined"){
    window.ADE_CURRICULUM = api;
    window.reaplicarDatosPrueba = function(){
      localStorage.removeItem("ade_seed_version");
      location.reload();
    };
  }
  if(typeof module !== "undefined" && module.exports) module.exports = api;

  try{
    if(typeof localStorage !== "undefined" && localStorage.getItem("ade_seed_version") !== SEED_VERSION){
      apply();
    }
  }catch(e){
    if(typeof console !== "undefined") console.error("[datos-prueba]", e);
  }

})();