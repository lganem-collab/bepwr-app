# bePWR PWA — Guía de instalación

## Archivos incluidos
- `index.html` — La app completa
- `manifest.json` — Configuración de la PWA (nombre, íconos, colores)
- `sw.js` — Service Worker (funciona offline)
- `icons/` — Carpeta para los íconos (ver instrucciones abajo)

---

## Paso 1 — Crear los íconos

Necesitas dos íconos con el logo de bePWR:
- `icons/icon-192.png` → 192×192 px
- `icons/icon-512.png` → 512×512 px

Puedes crearlos gratis en: https://realfavicongenerator.net

---

## Paso 2 — Subir a Vercel (gratis)

1. Ve a https://vercel.com y crea una cuenta gratis
2. Conecta tu cuenta de GitHub (o sube los archivos directamente)
3. Arrastra la carpeta `bepwr-pwa` a Vercel
4. En segundos tendrás una URL tipo: `https://bepwr-app.vercel.app`

---

## Paso 3 — Publicar en bePWR.com

Agrega este botón en tu página web:

```html
<a href="https://bepwr-app.vercel.app" target="_blank">
  Descarga la app bePWR
</a>
```

---

## Cómo instalan los usuarios

### Android (Chrome):
1. Entran al link desde Chrome
2. Aparece banner automático "Agregar a pantalla de inicio"
3. Tocan "Instalar" → ícono en el teléfono ✅

### iPhone (Safari):
1. Entran al link desde Safari
2. Tocan el ícono de compartir (cuadrado con flecha)
3. Seleccionan "Agregar a pantalla de inicio"
4. Ícono en el teléfono ✅

---

## Próximos pasos para la versión real

Para conectar datos reales de usuarios necesitarás:
- **Firebase** (base de datos gratuita de Google)
- **API de Claude** (para los mensajes de IA personalizados)
- Un desarrollador o FlutterFlow para conectarlo todo

