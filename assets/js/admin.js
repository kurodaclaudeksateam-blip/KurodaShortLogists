const loginCard = document.getElementById('login-card');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginStatus = document.getElementById('login-status');
const loginBtn = document.getElementById('login-btn');
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');
const uploadBtn = document.getElementById('upload-btn');
const uploadProgress = document.getElementById('upload-progress');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const videoList = document.getElementById('video-list');
const logoutBtn = document.getElementById('logout-btn');

const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

function showDashboard() {
    loginCard.hidden = true;
    dashboard.hidden = false;
    loadVideoList();
}

function showLogin() {
    loginCard.hidden = false;
    dashboard.hidden = true;
}

async function checkSession() {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
        showDashboard();
    } else {
        showLogin();
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    loginBtn.disabled = true;
    loginStatus.textContent = 'Verificando...';
    loginStatus.className = 'status-msg';

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    loginBtn.disabled = false;
    if (error) {
        loginStatus.textContent = 'Credenciales invalidas.';
        loginStatus.className = 'status-msg err';
        return;
    }
    loginStatus.textContent = '';
    loginForm.reset();
    showDashboard();
});

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    showLogin();
});

function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('videoInput');
    const descInput = document.getElementById('videoDescInput');

    if (!input.files || input.files.length === 0) {
        uploadStatus.textContent = 'Selecciona un video primero.';
        uploadStatus.className = 'status-msg err';
        return;
    }

    const file = input.files[0];
    uploadBtn.disabled = true;
    uploadProgress.classList.add('active');
    uploadProgressBar.style.width = '25%';
    uploadStatus.textContent = `Subiendo "${file.name}"...`;
    uploadStatus.className = 'status-msg';

    try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const userId = sessionData.session?.user?.id;
        const path = `${Date.now()}_${sanitizeFileName(file.name)}`;

        const { error: uploadError } = await supabaseClient.storage
            .from(SHORT_VIDEOS_BUCKET)
            .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

        if (uploadError) throw uploadError;
        uploadProgressBar.style.width = '75%';

        const { error: insertError } = await supabaseClient
            .from(SHORT_VIDEOS_TABLE)
            .insert({ description: descInput.value.trim(), storage_path: path, created_by: userId });

        if (insertError) throw insertError;

        uploadProgressBar.style.width = '100%';
        uploadStatus.textContent = 'Video guardado con exito.';
        uploadStatus.className = 'status-msg ok';

        setTimeout(() => {
            uploadForm.reset();
            uploadProgress.classList.remove('active');
            uploadProgressBar.style.width = '0%';
            uploadStatus.textContent = '';
            loadVideoList();
        }, 900);
    } catch (err) {
        console.error(err);
        uploadStatus.textContent = 'Error al subir: ' + (err.message || err);
        uploadStatus.className = 'status-msg err';
        uploadProgress.classList.remove('active');
        uploadProgressBar.style.width = '0%';
    } finally {
        uploadBtn.disabled = false;
    }
});

async function loadVideoList() {
    videoList.innerHTML = '<p class="subtitle">Cargando...</p>';

    const { data, error } = await supabaseClient
        .from(SHORT_VIDEOS_TABLE)
        .select('id, description, storage_path, views, likes, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        videoList.innerHTML = '<p class="subtitle">Error al cargar los videos.</p>';
        return;
    }

    if (!data || data.length === 0) {
        videoList.innerHTML = '<p class="subtitle">Todavia no hay videos publicados.</p>';
        return;
    }

    videoList.innerHTML = '';
    data.forEach((item) => {
        const { data: pub } = supabaseClient.storage.from(SHORT_VIDEOS_BUCKET).getPublicUrl(item.storage_path);
        const row = document.createElement('div');
        row.className = 'video-row';
        row.innerHTML = `
            <video src="${pub.publicUrl}" muted preload="metadata"></video>
            <div class="meta">
                <div class="desc">${item.description || '(sin descripcion)'}</div>
                <div class="stats">👁 ${item.views || 0} · ❤ ${item.likes || 0}</div>
            </div>
            <button class="del-btn" data-id="${item.id}" data-path="${item.storage_path}">${TRASH_ICON}</button>
        `;
        videoList.appendChild(row);
    });

    videoList.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteVideo(btn.dataset.id, btn.dataset.path));
    });
}

async function deleteVideo(id, path) {
    if (!confirm('¿Eliminar este video de forma permanente?')) return;

    await supabaseClient.storage.from(SHORT_VIDEOS_BUCKET).remove([path]);
    const { error } = await supabaseClient.from(SHORT_VIDEOS_TABLE).delete().eq('id', id);

    if (error) {
        alert('No se pudo eliminar: ' + error.message);
        return;
    }
    loadVideoList();
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
    session ? showDashboard() : showLogin();
});

checkSession();
