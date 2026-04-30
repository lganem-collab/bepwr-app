# CONTEXT.md — bePWR

> Este archivo es el contexto operacional del proyecto bePWR para conversaciones con Claude.
> **Al inicio de cada chat nuevo, ejecutar: `cat CONTEXT.md`**
> Si encuentras información desactualizada, avisar a Luis para corregir antes de tocar código.

---

## 1. Identidad

- **Producto:** bePWR Members — PWA de gestión de gimnasio funcional
- **Marca oficial:** **bePWR®** (con símbolo de marca registrada — usar siempre en código y documentación)
- **Titular:** Luis Gerardo Ganem / OPERADORA FIT TERRASOLA S.A. de C.V., Querétaro, México
- **Repo:** `lganem-collab/bepwr-app` (privado)
- **Dominio web producción:** `https://bepwr-app.vercel.app/`
- **Dominio de emails:** `@bepwr.vip` (ej: `citas@bepwr.vip`)
- **Luis no es programador.** Toda decisión técnica la toma Claude bajo supervisión y aprobación de Luis.

---

## 2. Estado del proyecto (29/04/2026)

- **Lanzamiento a usuarios finales: 01/05/2026** (pasado mañana).
- **`index.html` (app del miembro): 100%** funcional para usuarios. **V1 cerrada el 29/04/2026.**
- **`admin.html` (panel staff): 95%** funcional. Faltan detalles de uso interno que NO ven los usuarios finales.
- App estuvo 15 días en pruebas funcionando bien.
- **Implicación operacional:** cualquier cambio en `index.html` debe ser mínimo, probado y reversible. No refactors en lado usuario hasta después del lanzamiento.

---

## 3. Personas

| Persona | Rol | Email | Notas |
|---|---|---|---|
| Luis Ganem | Admin Maestro / dueño | (su email personal) | UID hardcodeado en admin: `1zZIfBnLGqRiPKVRVfHxlt2O3Di2`. Tiene permisos sobre TODO. |
| Brandon Lanuza | Admin (no Maestro) | `blanuza@bepwr.com` | Operador del gimnasio. Trabaja en `admin.html`: cargar agenda de clases, citas, etc. |
| Coaches | Coach | (varios) | Solo uno de prueba creado al 29/04. Pendiente de cargar en producción. |

---

## 4. Archivos del repo

### HTMLs principales

| Archivo | Líneas | SDK Firebase | Para qué sirve |
|---|---|---|---|
| `index.html` | 5,801 | **Modular v9 (11.4.0)** | App del miembro. Login, métricas, rutina, citas, mi proceso, mi QR. |
| `admin.html` | 4,962 | **Compat v8 (9.23.0)** | Panel para Luis y Brandon. 11 tabs (ver §6). |
| `recepcion.html` | 663 | **Modular v9 (11.4.0)** | Pantalla pública sin login. Lectura de QR para check-in. |

### Service Workers

| Archivo | Para qué sirve |
|---|---|
| `sw.js` | Service Worker principal de la PWA. Versión `bepwr-v15`. **No cachea assets** (skipWaiting directo). |
| `sw-recepcion.js` | Service Worker dedicado a `recepcion.html`. |
| `firebase-messaging-sw.js` | Service Worker para Firebase Cloud Messaging (push notifications). Usa SDK 9.23.0 compat. |

### API serverless (en `/api/`)

| Archivo | Para qué sirve |
|---|---|
| `chat.js` | Proxy hacia Anthropic Claude API. |
| `citas.js` | Operaciones del sistema de citas. |
| `create-staff.js` | Alta de staff con Firebase Admin SDK (no desconecta sesión del admin). |
| `send-cita.js` | Email transaccional al agendar/cancelar cita. |
| `send-welcome.js` | Email de bienvenida a nuevos miembros. |
| `send-delete-code.js` | Código de confirmación por email para acciones destructivas. |
| `notify.js` | Endpoint de notificaciones push. |
| `cron/notify-morning.js` | Recordatorio matutino programado. |
| `cron/notify-evening.js` | Recordatorio vespertino programado. |
| `cron/notify-coaches.js` | Notificación a coaches programada. |
| `cron/notify-daily.js` | Notificación diaria programada. |
| `cron/report-daily.js` | Reporte diario de citas (Vercel Cron, no GitHub Actions). |

### Workflow de GitHub Actions

| Archivo | Schedules (UTC) | Para qué sirve |
|---|---|---|
| `.github/workflows/notify.yml` | Lun/Vie 12:00 UTC (morning), Mié/Dom 23:00 UTC (evening), Lun-Vie 11:30 UTC (coaches), todos los días 15:00 UTC (daily) | Dispara los endpoints `cron/notify-*`. |

### Otros archivos relevantes

- `firestore.rules` — Reglas de seguridad de Firestore (commiteadas en repo).
- `firebase.json` — Configuración de Firebase.
- `vercel.json` — Configuración de Vercel (incluye `maxDuration: 60` para endpoints de IA).
- `manifest.json` — PWA del miembro.
- `manifest-recepcion.json` — PWA de recepción.
- `package.json` — dependencias npm.
- `pdfs/` — guías nutrimentales por objetivo.
- `medals/` — imágenes de medallas/logros.
- `icons/` — íconos de la PWA.

---

## 5. Stack técnico

- **Frontend:** HTML/CSS/JS vanilla. Un archivo HTML por herramienta. Sin frameworks.
- **Backend:** Vercel serverless functions (`/api/*`).
- **DB y Auth:** Firebase (proyecto `bepwr-app`). Firestore + Authentication + Cloud Messaging.
- **Hosting:** Vercel. Auto-deploy desde branch `main`. Tarda ~30 segundos post-push.
- **Email:** Resend (dominio `@bepwr.vip`).
- **IA:** Anthropic Claude API vía proxy `/api/chat` (modelo `claude-sonnet-4-5`).
- **Crons:** GitHub Actions para notify-*, Vercel Cron para report-daily.

---

## 6. Tabs del panel admin (`admin.html`)

| # | Tab ID | Nombre visible | Para qué sirve |
|---|---|---|---|
| 1 | home | Inicio | Página de aterrizaje del staff. |
| 2 | members | Miembros | Alta, edición, valoraciones, detalle de cada miembro. |
| 3 | staff | Staff | Alta y gestión de admins/coaches. |
| 4 | notify | Envío de Avisos | Mandar notificaciones push masivas o individuales. |
| 5 | bitacora | Bitácora | Log de acciones del staff. **Solo visible para el Admin Maestro (Luis), NO para Brandon.** |
| 6 | dashboard | Dashboard | Analítica de uso (visitas, reservas, msgs IA, etc). |
| 7 | citas | Citas Val | Configurar disponibilidad y ver agenda de citas de valoración. |
| 8 | pesos | Pesos | Tabla maestra de pesos del Índice de Evolución. |
| 9 | horario | Horario | Calendario semanal de clases. |
| 10 | clases | Clases | Catálogo de tipos de clase. |
| 11 | objetivos | Objetivos | Catálogo de objetivos del miembro (5 generales + 8 deportivos). |

Casi todos los tabs tienen `style="display:none"` por defecto. Se hacen visibles según el rol del usuario al cargar.

---

## 7. Convenciones técnicas vivas

### SDK de Firebase por archivo (CRÍTICO)

| Archivo | SDK | Sintaxis correcta | Sintaxis incorrecta |
|---|---|---|---|
| `index.html` | Modular v9 | updatePassword(user, nueva) | user.updatePassword(nueva) |
| `admin.html` | Compat v8 | db.collection('x').doc(y) | doc(db,'x',y) |
| `recepcion.html` | Modular v9 | getDoc(docRef(db,'x',y)) | db.collection('x') |

**Antes de tocar Auth/Firestore en cualquier archivo, confirmar el SDK del archivo.** Mezclar sintaxis es bug recurrente que falla silenciosamente.

### Formato de fechas y zona horaria

- **Zona horaria del proyecto: México (America/Mexico_City).** El gimnasio opera en Querétaro.
- En documentación, conversación y UI: **dd/mm/yyyy** (ej: 29/04/2026).
- En Firestore: timestamps nativos de Firebase.
- Cuidado con `new Date('YYYY-MM-DD')` — interpreta como UTC midnight y desplaza el día en zona horaria mexicana. **Siempre append `T12:00:00`.**
- **Bug recurrente en programación de mensajes:** el código omite la zona horaria y toma UTC. Cualquier cron, schedule, comparación de horas o disparo de notificación debe declarar explícitamente `America/Mexico_City` o convertir UTC↔CST/CDT manualmente. Validar con Luis antes de programar tiempos.

### Dos apps Firebase en admin

`admin.html` inicializa **dos apps Firebase**: la principal (línea 989) y `secondaryApp` (línea 997). La secundaria se usa para crear miembros sin desconectar la sesión del admin que está operando.

### Encoding español

- Caracteres con acento se corrompen fácil al escribir vía GitHub API. Usar `TextEncoder`/`TextDecoder` con chunked btoa.
- Emojis en `admin.html`: como HTML entities (`&#x1F525;`), nunca caracteres directos.

---

## 8. Reglas de trabajo entre Luis y Claude

1. **Una instrucción a la vez.** Claude espera resultado antes del siguiente paso.
2. **Declarar qué/por qué antes de tocar código.** Avisar si algo puede romperse.
3. **No refactorizar a menos que se pida explícitamente.**
4. **Preguntar si algo no es claro.** Asumir es la causa #1 de chats torpes.
5. **Usar Python para reemplazo exacto de texto.** Nunca pegar código directo.
6. **Plan → terminal → Luis pega resultado → continuar.** Luis copia comandos del chat al VS Code y devuelve resultado al chat.
7. **Después de 2 intentos fallidos, cambiar de estrategia.** No seguir parchando.
8. **Nunca asumir el dispositivo de Luis.** Luis usa **Android** y **Mac con VS Code**. No iOS, no Safari.
9. **Nunca declarar algo imposible sin verificar.**
10. **Pedir captura de pantalla antes de cambios visuales.**
11. **Confirmar resultados antes de declarar éxito.**
12. **Antes de proponer fix de un bug, leer el código exacto con `sed` o `grep` y mostrarlo.** No proponer plan basado en asunciones de memoria.

---

## 9. Frente activo único (al 29/04/2026)

### Auditar Dashboard antes del lanzamiento

- Ubicado en `admin.html` → tab Dashboard (item 6 del sidebar).
- **Síntoma observado:** muestra datos del "día XXX" y de "semana cero" — no cuadra con la realidad operativa.
- **Objetivo:** validar si los datos son valiosos para uso interno y corregir los conteos que no cuadran.
- Es uso interno (Luis/Brandon), no impacta a usuarios finales.

---

## 10. Cómo arrancar un chat nuevo (instrucción para Claude)

1. **Primer comando del chat:** `cat CONTEXT.md`. Leer todo.
2. **NO declarar "ya conozco el proyecto".** Preguntar a Luis qué frente se va a atacar.
3. **Antes de tocar código:** leer el archivo y la función exacta con `sed`/`grep`, mostrarlo a Luis, pedir reproducción del bug con consola del navegador abierta.
4. **Solo después de tener datos reales:** proponer plan.
5. **Una instrucción a la vez.** Luis copia comando, pega en VS Code, devuelve resultado. Repetir.

---

## 11. Plantilla para reportar bugs

Al abrir chat de bug, dar a Claude:
- **BUG:** una frase
- **DÓNDE:** archivo + ruta UI completa hasta la sección exacta
- **CAPTURA:** adjunta desde el primer mensaje (regla #10)
- **TEXTO ÚNICO EN PANTALLA:** una frase del UI que no aparezca en otra sección
- **PASOS PARA REPRODUCIR:** 1, 2, 3...
- **QUÉ ESPERABA / QUÉ PASA**

Esto evita que Claude asuma ubicación y arranque a parchar la sección equivocada (problema real ocurrido el 29/04/2026 con el bug de cambio de contraseña: tardamos 3 chats en localizar la función correcta porque CONTEXT.md describía el síntoma sin ubicación).

---

## 12. Aprendizajes técnicos del proyecto

### Política de contraseñas (alineada en toda la app)

Regla legible: **mínimo 6 caracteres + mayúscula + minúscula + número + símbolo (. ! * @ # $ % ^ & + = _ - ?)**.

Implementada en dos funciones de `index.html`:
- `savePrimerIngreso` (onboarding)
- `saveEditInfo` (Mi Perfil → Editar información)

Si alguna vez se sube a 8 caracteres mínimo, cambiar la regex en ambas funciones a la vez para no desalinear.

### Cambio de contraseña en `index.html` requiere re-autenticación

Firebase rechaza `updatePassword` si la sesión no es reciente. Patrón correcto en modular v9:

1. Construir credencial: `EmailAuthProvider.credential(user.email, passActual)`
2. Re-autenticar: `await reauthenticateWithCredential(user, cred)`
3. Cambiar password: `await updatePassword(user, passNueva)`

Manejar específicamente los códigos `auth/wrong-password` y `auth/invalid-credential` para mensaje claro al usuario.

### Bug recurrente: UI sin lógica detrás

`saveEditInfo` (al 29/04/2026, antes del fix) leía 3 campos de password pero nunca los usaba — el flujo terminaba en éxito visible sin tocar Firebase Auth. Patrón a vigilar en otras secciones: input + botón + mensaje de éxito ≠ función completa. Antes de declarar "no funciona Firebase", verificar que la función realmente llame a Firebase con `grep` sobre el nombre del SDK que debería usarse.

### Pegado de código a chat puede mostrar artefactos falsos

Al copiar JS desde la terminal y pegar al chat, propiedades como `user.email` pueden renderizarse como `[user.email](http://user.email)` — es filtro del cliente del chat, NO está en el archivo. Verificar siempre con `od -c` antes de asumir corrupción del disco.
