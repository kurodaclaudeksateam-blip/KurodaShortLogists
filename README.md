# KURODA&LOGIST SHORT

Feed de videos cortos estilo TikTok/Reels para contenido explicativo de la empresa. Sitio estatico (HTML/CSS/JS) respaldado por [Supabase](https://supabase.com) (base de datos, autenticacion y storage).

## Estructura

- `index.html` — Feed publico. Al entrar por primera vez pregunta el area del usuario (localStorage recuerda la eleccion) y muestra los videos de esa area en orden aleatorio; cualquier visitante puede ver, dar like, ver el contador de vistas y buscar por tema/descripcion.
- `admin/index.html` — Panel de control en la ruta `/admin`, protegido con Supabase Auth. Pestanas: Subir video, Videos publicados, Areas, Temas y Analiticas (top 100 por vistas o likes).
- `assets/js/supabase-client.js` — Configuracion del cliente de Supabase (URL + clave publica `anon`, protegida por Row Level Security).
- `assets/js/app.js` — Logica del feed publico (selector de area, busqueda, autoplay al hacer scroll, likes, vistas, controles de reproduccion).
- `assets/js/admin.js` — Logica del panel admin (login, pestanas, subida de video, catalogos de areas/temas, analiticas).
- `assets/css/style.css` — Estilos compartidos.

## Backend (Supabase)

Proyecto: `gk-control-operativo-entregas`.

Se crearon tablas y un bucket **nuevos y aislados**, sin modificar ninguna tabla existente del proyecto:

- Tabla `public.short_videos` (RLS activo):
  - Lectura publica solo de filas con `is_active = true`.
  - Insertar/actualizar/borrar solo permitido a usuarios autenticados (el admin).
  - Columnas `area` y `tema` para clasificar e indexar los videos.
  - Funciones `increment_video_views` / `increment_video_likes` (RPC `SECURITY DEFINER`) para sumar contadores sin exponer `UPDATE` publico sobre la tabla.
- Tablas `public.areas` y `public.temas` (catalogo administrable desde el panel):
  - Lectura publica (la necesita el selector de area al abrir la app).
  - Alta/baja solo permitida a usuarios autenticados.
- Bucket de Storage `short-videos` (publico de solo lectura):
  - Lectura publica de los archivos.
  - Subida/borrado de archivos solo permitido a usuarios autenticados.

## Compresion a AV1 al subir

El panel admin puede comprimir el video a **AV1** antes de subirlo (casilla activada por defecto). Usa el codificador AV1 nativo del navegador (API WebCodecs, vía la libreria [Mediabunny](https://mediabunny.dev)) — no WebAssembly, por eso tarda segundos y no minutos. El audio se copia tal cual (passthrough), sin volver a comprimirlo.

Validado con un benchmark real (`ffmpeg` + AV1 CRF 30 nativo) sobre un video ya subido: **~50-60% menos peso** con calidad **VMAF ~96/100** (por encima de 95 se considera visualmente indistinguible del original, el mismo estandar que usan YouTube/Netflix). En pruebas con esta libreria en el navegador se obtuvo consistentemente 40-60% de reduccion segun el contenido del video, en pocos segundos.

Requiere un navegador con soporte de codificacion AV1 vía WebCodecs (Chrome/Edge recientes). Si el navegador del admin no lo soporta, la app lo detecta automaticamente y sube el video original sin comprimir, avisando en pantalla.

## Crear el usuario administrador

Este proyecto usa **Supabase Auth** para proteger `/admin`. Antes de usar el panel, crea el usuario admin una sola vez:

1. Entra al [Dashboard de Supabase](https://supabase.com/dashboard/project/mhmqgjgfkcrgbtrhmtqw/auth/users).
2. Ve a **Authentication → Users → Add user**.
3. Ingresa el correo y la contrasena que usara el equipo para administrar el contenido.
4. Con esas credenciales, entra a `/admin` en el sitio publicado.

Puedes crear varios usuarios si mas de una persona administrara el contenido; todos los usuarios autenticados tienen permiso de administrador.

## Desarrollo local

Al ser un sitio estatico, basta con abrir `index.html` con un servidor local (por ejemplo `npx serve` o la extension Live Server) — abrir el archivo directamente con `file://` puede bloquear las peticiones a Supabase por CORS en algunos navegadores.

## Despliegue

Cualquier hosting estatico funciona (GitHub Pages, Vercel, Netlify). Si usas GitHub Pages, la ruta `/admin` se resuelve automaticamente a `admin/index.html`.
