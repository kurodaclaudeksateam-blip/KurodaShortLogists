# KURODA&LOGIST SHORT

Feed de videos cortos estilo TikTok/Reels para contenido explicativo de la empresa. Sitio estatico (HTML/CSS/JS) respaldado por [Supabase](https://supabase.com) (base de datos, autenticacion y storage).

## Estructura

- `index.html` — Feed publico. Cualquier visitante puede ver los videos activos, dar like y ver el contador de vistas.
- `admin/index.html` — Panel de administracion en la ruta `/admin`. Pide inicio de sesion (Supabase Auth) antes de mostrar el formulario de carga.
- `assets/js/supabase-client.js` — Configuracion del cliente de Supabase (URL + clave publica `anon`, protegida por Row Level Security).
- `assets/js/app.js` — Logica del feed publico (autoplay al hacer scroll, likes, vistas, controles de reproduccion).
- `assets/js/admin.js` — Logica del panel admin (login, subida de video, listado y borrado).
- `assets/css/style.css` — Estilos compartidos.

## Backend (Supabase)

Proyecto: `gk-control-operativo-entregas`.

Se creo una tabla y un bucket **nuevos y aislados**, sin modificar ninguna tabla existente del proyecto:

- Tabla `public.short_videos` (RLS activo):
  - Lectura publica solo de filas con `is_active = true`.
  - Insertar/actualizar/borrar solo permitido a usuarios autenticados (el admin).
  - Funciones `increment_video_views` / `increment_video_likes` (RPC `SECURITY DEFINER`) para sumar contadores sin exponer `UPDATE` publico sobre la tabla.
- Bucket de Storage `short-videos` (publico de solo lectura):
  - Lectura publica de los archivos.
  - Subida/borrado de archivos solo permitido a usuarios autenticados.

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
