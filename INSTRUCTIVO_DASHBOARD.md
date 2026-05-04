# Instructivo del Dashboard — bePWR Admin

> Manual de uso del Dashboard del panel admin (`admin.html` → tab Dashboard).
> Audiencia: Luis y Brandon. Sin tecnicismos.
> Última actualización: 04/05/2026 (con heatmap por hora del día).

---

## Cómo entrar

1. Abre `https://bepwr-app.vercel.app/admin.html`
2. Inicia sesión con tu cuenta de admin
3. En el sidebar izquierdo, click **Dashboard** (ícono 📊)

---

## Lo que verás (de arriba hacia abajo)

### 1. Selector de período (Diario · Semanal · Mensual)

Arriba del todo. Cambia la ventana de tiempo de las gráficas que están justo abajo (visitas, altas, acciones).

- **Diario:** últimos 14 días
- **Semanal:** últimas 10 semanas
- **Mensual:** últimos 6 meses

Las **otras vistas** (heatmap, cohorte, funnel, rankings, secciones, tiempo) **NO** dependen de este selector — usan sus propios rangos fijos.

---

### 2. Insights · Resumen rápido

#### Stats chips
Cinco tarjetas grandes con números clave:

- **ACTIVOS** — total de miembros con `activo=true` en la base de datos
- **NUEVOS 7D** — cuántos se dieron de alta en los últimos 7 días
- **ABRIERON 7D** — cuántos miembros activos abrieron la app en los últimos 7 días
- **EN RIESGO** — cuántos miembros activos NO han entrado en +7 días
- **DÍA PICO** — el día de la semana con más visitas (Lun, Mar, Mié, etc.)

#### Botón "Generar interpretación IA"
Cuando le das click, Claude (IA) lee todos los datos del dashboard y te escribe **3-4 insights coloquiales** (1-2 párrafos cortos). Tarda 3-5 segundos. Cuesta ~1 centavo de dólar por click.

**Cuándo usarlo:** cuando quieres una "lectura rápida" sin interpretar tú las gráficas. Ideal cada lunes en la mañana.

**Tono:** la IA está configurada para sonar coloquial mexicano — como un coach o asesor que te habla derecho. Verás frases tipo "Aguas con Ana, lleva 2 semanas sin meterse", "Los martes 7pm es tu momento, ahí pega un push fuerte", "Brandon va bien chido con 22 visitas". NO suena a reporte corporativo.

---

### 3. Tarjetas de totales (5 cuadros chicos)

Justo abajo del panel de insights. Resumen de lo que pasó en el período seleccionado:

- **VISITAS** — total de aperturas de la app
- **ACTIVOS** — total de miembros activos
- **RESERVAS** — clases reservadas
- **MSGS IA** — mensajes al chat IA + análisis científicos solicitados
- **NOTIF ABIERTAS** — push notifications que el usuario abrió

---

### 4. Gráficas de barras (3 bloques apilados)

Tres bar charts según el período seleccionado:

| Gráfica | Color | Qué muestra |
|---|---|---|
| **VISITAS A LA APP** | naranja | Cuántas veces abrieron la app por día/semana/mes |
| **ALTAS DE MIEMBROS** | verde | Cuántos miembros nuevos por período |
| **ACCIONES (RESERVAS · IA · ANÁLISIS · NOTIF)** | azul | Suma de todas las acciones que toman los usuarios |

**Cómo se lee:** las barras más altas son los días/semanas/meses con más actividad. Útil para ver tendencia (¿estamos creciendo o bajando?).

---

### 5. Visitas por miembro (tabla)

Tabla con tres columnas:
- MIEMBRO
- VISITAS (en el período seleccionado)
- ÚLTIMA (fecha de la última visita)

Ordenada por visitas desc. Útil para ver quién es más activo en el período.

---

### 6. Heatmap de actividad · últimos 30 días

Tabla en formato calendario:
- **Filas:** top 30 miembros más activos en los últimos 30 días
- **Columnas:** los últimos 30 días (más antiguo a la izquierda, hoy a la derecha)
- **Color de cada celda:**
  - Gris oscuro = 0 visitas ese día
  - Naranja oscuro = 1 visita
  - Naranja medio = 2 visitas
  - Naranja claro = 3-4 visitas
  - Naranja brillante = 5+ visitas
- **Letras arriba (D L M M J V S):** día de la semana. Los lunes están resaltados en blanco.
- **Tooltip:** pasa el mouse sobre una celda y te dice nombre + fecha + número de visitas.

**Lo que te dice:**
- **Power users:** filas con muchas celdas naranjas → tus mejores miembros
- **Miembros enfriándose:** filas que se apagan hacia la derecha → considera mandarles push
- **Días pico:** columnas con muchas celdas naranjas → buen momento para mandar avisos
- **Días muertos:** columnas casi todas grises → ahí pega más fuerte una notificación

---

### 7. Cuándo se conectan · Hora por día de la semana

Tabla en formato calendario, distinta al heatmap anterior:
- **Filas:** los 7 días de la semana (Lun, Mar, Mié, Jue, Vie, Sáb, Dom)
- **Columnas:** las 24 horas del día (0 a 23, en horario de México)
- **Celdas:** color naranja según número de visitas en esa franja específica
- **Etiqueta abajo:** te dice automáticamente cuál es tu **hora pico** (ej: `Mar 19:00 es tu hora pico (47 visitas en 30d)`)

**Lo que te dice:**
- **Hora pico exacta:** sabes que los miembros se conectan más, por ejemplo, los lunes a las 7pm — ahí es perfecto programar un push
- **Patrón semanal:** ¿usan más la app entre semana o fin de semana?
- **Patrón horario:** ¿se conectan en la mañana antes del gym, o en la noche para revisar progreso?
- **Horarios muertos:** si los domingos en la mañana nadie entra, no programes ahí avisos

**Ejemplo de uso real:**
Si la tabla muestra que el martes a las 7pm es tu pico, y tu cron actual de notificaciones está programado para mandar a las 9am, considera moverlo a las 6:45pm — vas a tener mejor tasa de apertura.

---

### 8. Retención por cohorte

Tabla donde cada fila es un grupo de miembros que se dieron de alta en la misma semana.

| Columna | Significado |
|---|---|
| **SEMANA DE ALTA** | rango de fechas (ej: `27-03 may`) |
| **N** | cuántos miembros se dieron de alta esa semana |
| **S0** | % de ese grupo que abrió la app en esa misma semana |
| **S1** | % que regresó la semana siguiente |
| **S2-S5** | % que regresó 2, 3, 4, 5 semanas después |

**Colores de las celdas:**
- 🟩 Verde ≥80% — excelente retención
- 🟨 Amarillo 40-79% — retención normal
- 🟥 Rojo <40% — alerta, miembros se están yendo
- `–` — semana futura (todavía no pasa)

**Lo que te dice:**
- **S0 bajo (rojo en la primera columna):** miembros nuevos NO están abriendo la app en su primera semana → revisa el email de bienvenida o el flujo de onboarding
- **Caída fuerte de S0 a S1:** se enganchan al inicio pero los pierdes pronto → la primera experiencia necesita más valor
- **Cohortes recientes con números mejores que las viejas:** estás mejorando el producto
- **Cohortes recientes peores que las viejas:** algo cambió y no engancha igual

---

### 9. Funnel de activación

Cinco barras horizontales que muestran el "embudo" del miembro:

```
TOTAL MIEMBROS ACTIVOS    ████████████████ 100%
HAN ABIERTO LA APP        ██████████░░░░░░  X%
HICIERON UNA RESERVA      ██████░░░░░░░░░░  X%
USARON CHAT IA / ANÁLISIS ████░░░░░░░░░░░░  X%
ACTIVOS ESTA SEMANA       ███░░░░░░░░░░░░░  X%   ← esta en verde
```

**Cada paso es independiente:** un miembro puede haber usado el chat IA sin haber hecho una reserva. NO es estricto que cada paso requiera el anterior.

**Lo que te dice:**
- **Salto grande de "ACTIVOS" a "HAN ABIERTO":** muchos miembros se registraron pero nunca entraron a la app → el email de bienvenida no convence
- **Salto grande a "HICIERON RESERVA":** los miembros usan la app pero no se animan a reservar → el flujo de reservas tiene fricción
- **% en verde "ACTIVOS ESTA SEMANA" muy bajo:** la app no tiene engagement recurrente

---

### 10. Rankings (top y en riesgo)

Dos tablas lado a lado:

#### 🔥 TOP 10 MÁS ACTIVOS (30D)
Los 10 miembros con más visitas en los últimos 30 días.
- **Acción sugerida:** son tus power users. Considera reconocerlos (medalla, mensaje personal).

#### ⚠️ TOP 10 EN RIESGO (+7D SIN ENTRAR)
Los 10 miembros activos que NO han abierto la app en +7 días, ordenados por más tiempo sin entrar.
- **Botón 📣 (megáfono) en cada fila:** te manda push directo al miembro con un mensaje predefinido ("Te extrañamos en bePWR. ¡Vuelve a entrenar!")
- **Color rojo:** +14 días sin entrar (más urgente)
- **Color amarillo:** 8-14 días sin entrar
- **Mensaje verde "Nadie en riesgo":** todos entraron en los últimos 7 días — felicidades.

**Acción sugerida:** revisar esta tabla cada lunes y mandar un nudge a los rojos.

---

### 11. Secciones más visitadas (últimos 7 días)

Bar chart horizontal azul. Te dice **qué pestañas de la PWA usa más la gente**.

- **% mostrado:** porcentaje de miembros activos que visitó esa sección al menos una vez en los últimos 7 días.
- **Las 6 secciones de la PWA:** Inicio, Método, Métricas, Mi QR, Avisos, Mi Perfil.

**Lo que te dice:**
- **Sección con bajo %:** los usuarios la ignoran → vale la pena replantear su contenido o quitar la sección
- **Sección con alto %:** es lo que más buscan → invertir más ahí, mejorarla

> **Nota:** este dashboard solo cuenta usuarios que actualizaron la PWA después del 04/05/2026 (cuando se desplegó el tracking de navegación). Es decir, los datos se irán acumulando con el tiempo. Las primeras semanas pueden verse vacías.

---

### 12. Tiempo promedio por sección (últimos 14 días)

Bar chart horizontal morado. Tiempo promedio (en MM:SS) que un miembro pasa en cada sección antes de cambiarse a otra.

**Cómo se calcula:** se mide el tiempo entre que el usuario entra a una sección y se cambia a otra. Sesiones de menos de 1 segundo o más de 30 minutos se descartan (errores o tabs olvidadas).

**Lo que te dice:**
- **Sección con mucho tiempo:** ahí se enganchan, leen, exploran → contenido valioso
- **Sección con poco tiempo (5-10 segundos):** solo pasan, no encuentran lo que buscan → mejorar UX o contenido

> Misma nota que el #11: datos se acumulan a partir del 04/05/2026.

---

### 13. Citas de valoración

Resumen del sistema de citas de valoración. **Consulta su propia colección** (`citas`) en Firestore — no depende de los eventos como las otras vistas. **Respeta el filtro general de la página** (Diario / Semanal / Mensual).

**5 chips arriba:**
- **TOTAL [14D / 10S / 6M]** — citas agendadas en el período seleccionado, según el filtro arriba (Diario=14d, Semanal=10 semanas, Mensual=6 meses). Confirmadas + canceladas.
- **CONFIRMADAS** — siguen activas (en el período seleccionado)
- **CANCELADAS** — se cancelaron (ya sea por el miembro o por el sistema al re-agendar)
- **% CANCELACIÓN** — `canceladas / total × 100`
- **PRÓX 7D** — citas confirmadas en los próximos 7 días (este chip NO se ve afectado por el filtro general, siempre son los próximos 7 días)

**Tabla abajo:** lista de las próximas 12 citas confirmadas, ordenadas por fecha + hora. Cada fila: día (ej: `Mar 06/05`), hora, nombre del miembro.

**Lo que te dice:**
- **% cancelación alto (>30%):** los miembros agendan pero no llegan o se arrepienten → revisa el flujo de recordatorios o las opciones de horario
- **PRÓX 7D vacío:** no hay citas próximas → revisa que tus rangos de disponibilidad estén bien configurados
- **Volumen TOTAL bajo:** los miembros no usan la cita de valoración → ¿saben que existe? ¿el botón está visible en la app?

> **Nota técnica:** la cita de valoración ahora también cuenta para el funnel y para la barra "HICIERON UNA RESERVA" (junto con clicks al botón de "Reservar clase"). Antes del 04/05/2026, solo contaba el click a clase. La colección `citas` siempre tuvo todos los datos, este cambio solo los integra al dashboard analítico.

---

## Cómo usar el Dashboard semanalmente (rutina sugerida)

**Cada lunes, 10 minutos:**

1. Click en "Generar interpretación IA" → léete el resumen coloquial de Claude
2. Revisa el **Heatmap de actividad** (sección 6) → ¿quién se está enfriando?
3. Mira **Cuándo se conectan** (sección 7) → ¿la hora pico cambió esta semana? Ajusta tus pushes
4. Revisa **Top 10 en riesgo** (sección 10) → manda push a los rojos con el botón 📣
5. Mira la **Retención por cohorte** (sección 8) → ¿la cohorte de hace 4 semanas sigue activa o ya se cayó?
6. Revisa el **Funnel** (sección 9) → ¿hay un cuello de botella nuevo?

**Cada mes:**

1. Cambia el período a **Mensual** y revisa las gráficas de barras (sección 4)
2. Compara el ranking del mes vs el del mes pasado (top activos)
3. Mira las **Secciones más visitadas** (sección 11) → ¿hay secciones que vale la pena ajustar?
4. Revisa **Tiempo por sección** (sección 12) → ¿qué les engancha más?

---

## Preguntas frecuentes

### ¿Por qué algunos dashboards se ven vacíos al principio?

- Heatmap, secciones, tiempo: solo muestran datos a partir del **despliegue del tracking** (04/05/2026 para secciones/tiempo). Antes de esa fecha no había registro.
- Cohorte: necesita varias semanas de datos para llenarse.

### ¿Cuánto tiempo guarda los datos?

- Firestore guarda todo. El dashboard lee los **últimos 2,000 eventos** ordenados por fecha. Para el volumen actual de bePWR esto cubre varias semanas.

### ¿El botón "Generar IA" cuesta dinero?

- Sí, ~1 centavo de dólar por click. No te preocupes por usarlo. 100 clicks = $1.

### ¿Puedo mandar un push personalizado en vez del genérico desde el botón 📣?

- El botón 📣 manda un mensaje predefinido. Si quieres mandar uno personalizado, ve al tab **Envío de Avisos** y usa ahí la opción "Individual" para escoger al miembro y escribir tu propio mensaje.

### ¿Qué pasa si un miembro se da de baja (`activo=false`)?

- Ya no aparece en ninguna métrica del dashboard. Solo cuentan miembros activos.

### ¿Quién ve este dashboard?

- Solo admin (Luis) y staff con rol admin. Brandon también puede verlo. Coaches no.

---

## Si algo se ve raro

1. **Refresca la página** (Cmd+Shift+R en Mac, Ctrl+Shift+R en Windows)
2. Abre la **consola del navegador** (F12 o Cmd+Option+J) y mira si hay errores en rojo
3. Avisa a Luis con captura de pantalla + lo que viste en la consola

---
