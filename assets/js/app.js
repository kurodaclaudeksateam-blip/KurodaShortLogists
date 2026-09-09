const feedContainer = document.getElementById('feed-container');
const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchCloseBtn = document.getElementById('search-close-btn');
const areaToggleBtn = document.getElementById('area-toggle-btn');
const areaModal = document.getElementById('area-modal');
const areaOptions = document.getElementById('area-options');
const areaSkipBtn = document.getElementById('area-skip-btn');

const AREA_KEY = 'kuroda_selected_area';
const AREA_ALL = 'ALL';

function getSelectedArea() { return localStorage.getItem(AREA_KEY); }
function setSelectedArea(area) { localStorage.setItem(AREA_KEY, area); }

function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const ICONS = {
    heart: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    comment: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    rewind: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg>',
    forward: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>',
    play: '<svg viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>'
};

function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

let toastTimeout = null;
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('active');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('active'), 2200);
}

function getVideoShareUrl(id) {
    return `${location.origin}${location.pathname}?v=${id}`;
}

async function shareVideo(id, description) {
    const url = getVideoShareUrl(id);

    if (navigator.share) {
        try {
            await navigator.share({ title: 'KURODA&LOGIST', text: description || 'Mira este video', url });
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Error al compartir:', err);
        }
        return;
    }

    try {
        await navigator.clipboard.writeText(url);
        showToast('Enlace copiado al portapapeles');
    } catch (err) {
        console.error('Error al copiar el enlace:', err);
        showToast('No se pudo copiar el enlace');
    }
}

function escapeAttr(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function likedKey(id) { return 'liked_' + id; }

const observerOptions = { root: feedContainer, rootMargin: '0px', threshold: 0.7 };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target.querySelector('video');
        if (!video) return;
        if (entry.isIntersecting) {
            video.play().catch(() => {});
            const videoId = entry.target.dataset.videoId;
            if (videoId && !entry.target.dataset.viewCounted) {
                entry.target.dataset.viewCounted = '1';
                supabaseClient.rpc('increment_video_views', { p_id: videoId }).then(() => {});
            }
        } else {
            video.pause();
            video.currentTime = 0;
        }
    });
}, observerOptions);

function clearFeedDom() {
    feedContainer.querySelectorAll('.video-wrapper').forEach(el => el.remove());
}

function renderEmptyState(searchTerm) {
    const message = searchTerm
        ? `No encontramos videos para "<strong>${searchTerm}</strong>".`
        : 'Muy pronto encontraras aqui contenido de KURODA&amp;LOGIST.';
    feedContainer.insertAdjacentHTML('beforeend', `
        <div class="video-wrapper">
            <div class="empty-feed">
                <h3>${searchTerm ? 'Sin resultados' : 'Aun no hay videos'}</h3>
                <p>${message}</p>
            </div>
        </div>
    `);
}

function renderErrorState(message) {
    feedContainer.insertAdjacentHTML('beforeend', `
        <div class="video-wrapper">
            <div class="state-message">
                <h3>No se pudo cargar el feed</h3>
                <p>${message}</p>
            </div>
        </div>
    `);
}

function renderLoadingState() {
    feedContainer.insertAdjacentHTML('beforeend', `
        <div class="video-wrapper" id="loading-wrapper">
            <div class="state-message">
                <div class="spinner"></div>
                <p>Cargando videos...</p>
            </div>
        </div>
    `);
}

function triggerLikeBurst(wrapper, x, y) {
    const burst = document.createElement('div');
    burst.className = 'like-burst';
    burst.innerHTML = '❤️';
    burst.style.left = (x - 45) + 'px';
    burst.style.top = (y - 45) + 'px';
    wrapper.appendChild(burst);
    setTimeout(() => burst.remove(), 700);
}

async function likeVideo(id, actionBtn) {
    const key = likedKey(id);
    const already = localStorage.getItem(key);
    const countSpan = actionBtn.querySelector('.count');
    if (already) {
        actionBtn.classList.remove('liked');
        localStorage.removeItem(key);
        countSpan.innerText = Math.max(0, parseInt(countSpan.innerText, 10) - 1);
        return;
    }
    actionBtn.classList.add('liked');
    localStorage.setItem(key, '1');
    countSpan.innerText = parseInt(countSpan.innerText, 10) + 1;
    await supabaseClient.rpc('increment_video_likes', { p_id: id });
}

function renderVideos(videos) {
    videos.forEach((item) => {
        const videoId = 'vid_' + item.id;
        const { data: pub } = supabaseClient.storage.from(SHORT_VIDEOS_BUCKET).getPublicUrl(item.storage_path);
        const videoUrl = pub.publicUrl;
        const description = item.description || item.title || '';
        const alreadyLiked = !!localStorage.getItem(likedKey(item.id));

        const html = `
            <div class="video-wrapper" data-video-id="${item.id}">
                <video id="${videoId}" src="${videoUrl}" loop playsinline preload="metadata"></video>
                <div class="bottom-shadow-overlay"></div>

                <div class="video-info">
                    ${(item.area || item.tema) ? `<div>${item.area ? `<button class="area-badge" data-area-gallery="${escapeAttr(item.area)}">${item.area}</button>` : ''}${item.tema ? `<button class="tema-badge" data-tema="${escapeAttr(item.tema)}">${item.tema}</button>` : ''}</div>` : ''}
                    <div class="username">KURODA&amp;LOGIST</div>
                    <div class="description">${description}</div>
                </div>

                <div class="interaction-bar">
                    <div class="action-btn ${alreadyLiked ? 'liked' : ''}" data-like-id="${item.id}">
                        <div class="icon-circle">${ICONS.heart}</div>
                        <span class="count">${item.likes || 0}</span>
                    </div>
                    <div class="action-btn" data-comment-id="${item.id}">
                        <div class="icon-circle">${ICONS.comment}</div>
                        <span class="count">${item.comments_count || 0}</span>
                    </div>
                    <div class="action-btn">
                        <div class="icon-circle">${ICONS.eye}</div>
                        <span class="count">${item.views || 0}</span>
                    </div>
                    <div class="action-btn" data-share-id="${item.id}" data-share-desc="${escapeAttr(description)}">
                        <div class="icon-circle">${ICONS.share}</div>
                    </div>
                </div>

                <div class="playback-controls">
                    <div class="time-row" id="time_${item.id}">0:00 / 0:00</div>
                    <div class="controls-row">
                        <button class="control-btn" data-skip="-5" data-target="${videoId}">${ICONS.rewind}</button>
                        <div class="progress-bar-container" data-seek-target="${videoId}">
                            <div class="progress-fill" id="prog_${item.id}"></div>
                        </div>
                        <button class="control-btn" data-skip="5" data-target="${videoId}">${ICONS.forward}</button>
                    </div>
                </div>
            </div>
        `;
        feedContainer.insertAdjacentHTML('beforeend', html);
    });

    document.querySelectorAll('.video-wrapper[data-video-id]').forEach(wrapper => {
        const video = wrapper.querySelector('video');
        if (!video) return;

        observer.observe(wrapper);

        video.addEventListener('click', () => { video.paused ? video.play() : video.pause(); });
        video.addEventListener('dblclick', (e) => {
            const likeBtn = wrapper.querySelector('.action-btn[data-like-id]');
            if (likeBtn && !likeBtn.classList.contains('liked')) likeVideo(likeBtn.dataset.likeId, likeBtn);
            triggerLikeBurst(wrapper, e.offsetX, e.offsetY);
        });
        const timeEl = document.getElementById(video.id.replace('vid_', 'time_'));
        function updateTimeDisplay() {
            if (timeEl && video.duration) timeEl.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
        video.addEventListener('loadedmetadata', updateTimeDisplay);
        video.addEventListener('timeupdate', () => {
            const progressId = video.id.replace('vid_', 'prog_');
            const progressBar = document.getElementById(progressId);
            if (progressBar && video.duration) progressBar.style.width = (video.currentTime / video.duration) * 100 + '%';
            updateTimeDisplay();
        });

        wrapper.querySelector('.action-btn[data-like-id]')?.addEventListener('click', function () {
            likeVideo(this.dataset.likeId, this);
        });

        wrapper.querySelector('.action-btn[data-share-id]')?.addEventListener('click', function (e) {
            e.stopPropagation();
            shareVideo(this.dataset.shareId, this.dataset.shareDesc);
        });

        wrapper.querySelector('.action-btn[data-comment-id]')?.addEventListener('click', function (e) {
            e.stopPropagation();
            openComments(this.dataset.commentId);
        });

        wrapper.querySelector('.tema-badge[data-tema]')?.addEventListener('click', function (e) {
            e.stopPropagation();
            openGallery('tema', this.dataset.tema);
        });

        wrapper.querySelector('.area-badge[data-area-gallery]')?.addEventListener('click', function (e) {
            e.stopPropagation();
            openGallery('area', this.dataset.areaGallery);
        });

        wrapper.querySelectorAll('.control-btn[data-skip]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = document.getElementById(btn.dataset.target);
                if (target) target.currentTime += parseFloat(btn.dataset.skip);
            });
        });

        wrapper.querySelector('.progress-bar-container[data-seek-target]')?.addEventListener('click', function (e) {
            const target = document.getElementById(this.dataset.seekTarget);
            if (!target) return;
            const clickPos = (e.clientX - this.getBoundingClientRect().left) / this.offsetWidth;
            target.currentTime = clickPos * target.duration;
        });
    });
}

function sanitizeForFilter(term) {
    return term.replace(/[,()%]/g, ' ').trim();
}

async function loadFeed(searchTerm) {
    clearFeedDom();
    renderLoadingState();

    let query = supabaseClient
        .from(SHORT_VIDEOS_TABLE)
        .select('id, title, description, tema, area, storage_path, views, likes, comments_count, created_at')
        .eq('is_active', true);

    const cleanTerm = searchTerm ? sanitizeForFilter(searchTerm) : '';
    const selectedArea = getSelectedArea();

    if (cleanTerm) {
        query = query.or(`tema.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%`);
    } else if (selectedArea && selectedArea !== AREA_ALL) {
        query = query.eq('area', selectedArea);
    }

    const { data: videos, error } = await query.order('created_at', { ascending: false });

    document.getElementById('loading-wrapper')?.remove();

    if (error) {
        console.error('Error cargando videos:', error);
        renderErrorState('Verifica tu conexion e intenta nuevamente.');
        return;
    }

    if (!videos || videos.length === 0) {
        renderEmptyState(cleanTerm);
        return;
    }

    renderVideos(cleanTerm ? videos : shuffleArray(videos));
}

const VIDEO_SELECT_COLUMNS = 'id, title, description, tema, area, storage_path, views, likes, comments_count, created_at';

async function loadFeedWithSharedVideo(videoId) {
    clearFeedDom();
    renderLoadingState();
    history.replaceState({}, '', location.pathname);

    const { data: sharedVideo } = await supabaseClient
        .from(SHORT_VIDEOS_TABLE)
        .select(VIDEO_SELECT_COLUMNS)
        .eq('id', videoId)
        .eq('is_active', true)
        .maybeSingle();

    document.getElementById('loading-wrapper')?.remove();

    if (!sharedVideo) {
        renderErrorState('El video que buscas ya no esta disponible.');
        return;
    }

    renderVideos([sharedVideo]);

    const selectedArea = getSelectedArea();
    let restQuery = supabaseClient
        .from(SHORT_VIDEOS_TABLE)
        .select(VIDEO_SELECT_COLUMNS)
        .eq('is_active', true)
        .neq('id', videoId);
    if (selectedArea && selectedArea !== AREA_ALL) restQuery = restQuery.eq('area', selectedArea);

    const { data: rest } = await restQuery.order('created_at', { ascending: false });
    if (rest && rest.length) renderVideos(shuffleArray(rest));
}

/* ---------- Galeria por tema ---------- */

const galleryOverlay = document.getElementById('gallery-overlay');
const galleryTitle = document.getElementById('gallery-title');
const galleryGrid = document.getElementById('gallery-grid');
const galleryCloseBtn = document.getElementById('gallery-close-btn');

async function openGallery(field, value) {
    galleryTitle.textContent = value;
    galleryGrid.innerHTML = '<div class="gallery-empty">Cargando...</div>';
    galleryOverlay.hidden = false;

    const { data, error } = await supabaseClient
        .from(SHORT_VIDEOS_TABLE)
        .select(VIDEO_SELECT_COLUMNS)
        .eq(field, value)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        galleryGrid.innerHTML = '<div class="gallery-empty">No hay videos aqui todavia.</div>';
        return;
    }

    galleryGrid.innerHTML = data.map(item => `
        <div class="gallery-card" data-video-id="${item.id}">
            <div class="thumb">${ICONS.play}</div>
            <div class="meta">
                <div class="title">${escapeAttr(item.title || item.description || 'Sin titulo')}</div>
                <div class="stats">👁 ${item.views || 0}</div>
            </div>
        </div>
    `).join('');

    galleryGrid.querySelectorAll('.gallery-card').forEach(card => {
        card.addEventListener('click', () => {
            closeGallery();
            loadFeedWithSharedVideo(card.dataset.videoId);
        });
    });
}

function closeGallery() {
    galleryOverlay.hidden = true;
}

galleryCloseBtn.addEventListener('click', closeGallery);

/* ---------- Comentarios ---------- */

const commentsOverlay = document.getElementById('comments-overlay');
const commentsList = document.getElementById('comments-list');
const commentForm = document.getElementById('comment-form');
const commentInput = document.getElementById('comment-input');
const commentsCloseBtn = document.getElementById('comments-close-btn');

const COMMENTER_NAME_KEY = 'kuroda_commenter_name';
let activeCommentsVideoId = null;

function getCommenterName() {
    let name = localStorage.getItem(COMMENTER_NAME_KEY);
    if (!name) {
        name = (prompt('¿Con que nombre quieres comentar?', '') || '').trim().slice(0, 60);
        if (!name) name = 'Anonimo';
        localStorage.setItem(COMMENTER_NAME_KEY, name);
    }
    return name;
}

function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString();
}

function renderComments(comments) {
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<div class="comments-empty">Se el primero en comentar.</div>';
        return;
    }
    commentsList.innerHTML = comments.map(c => `
        <div class="comment-row">
            <div class="avatar"></div>
            <div class="body">
                <span class="author">${escapeAttr(c.author_name)}</span><span class="time">${timeAgo(c.created_at)}</span>
                <div class="text">${escapeAttr(c.content)}</div>
            </div>
        </div>
    `).join('');
    commentsList.scrollTop = 0;
}

async function loadComments(videoId) {
    commentsList.innerHTML = '<div class="comments-empty">Cargando...</div>';
    const { data, error } = await supabaseClient
        .from('video_comments')
        .select('id, author_name, content, created_at')
        .eq('video_id', videoId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        commentsList.innerHTML = '<div class="comments-empty">No se pudieron cargar los comentarios.</div>';
        return;
    }
    renderComments(data);
}

function openComments(videoId) {
    activeCommentsVideoId = videoId;
    commentsOverlay.hidden = false;
    loadComments(videoId);
}

function closeComments() {
    commentsOverlay.hidden = true;
    activeCommentsVideoId = null;
    commentInput.value = '';
}

function updateCommentCountBadge(videoId, delta) {
    const wrapper = document.querySelector(`.video-wrapper[data-video-id="${videoId}"]`);
    const countSpan = wrapper?.querySelector('.action-btn[data-comment-id] .count');
    if (countSpan) countSpan.textContent = Math.max(0, parseInt(countSpan.textContent, 10) + delta);
}

commentsCloseBtn.addEventListener('click', closeComments);
commentsOverlay.addEventListener('click', (e) => { if (e.target === commentsOverlay) closeComments(); });

commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = commentInput.value.trim();
    if (!content || !activeCommentsVideoId) return;

    const authorName = getCommenterName();
    commentInput.value = '';

    const { error } = await supabaseClient.from('video_comments').insert({
        video_id: activeCommentsVideoId,
        author_name: authorName,
        content
    });

    if (error) {
        console.error('Error al comentar:', error);
        showToast('No se pudo publicar el comentario.');
        return;
    }

    updateCommentCountBadge(activeCommentsVideoId, 1);
    loadComments(activeCommentsVideoId);
});

async function initAreaPicker() {
    const { data: areas } = await supabaseClient.from('areas').select('name').order('name');

    if (!areas || areas.length === 0) {
        loadFeed();
        return;
    }

    areaOptions.innerHTML = areas.map(a =>
        `<button class="area-option-btn" data-area="${a.name}">${a.name}</button>`
    ).join('');

    areaOptions.querySelectorAll('.area-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setSelectedArea(btn.dataset.area);
            areaModal.hidden = true;
            loadFeed();
        });
    });

    areaModal.hidden = false;
}

areaSkipBtn.addEventListener('click', () => {
    setSelectedArea(AREA_ALL);
    areaModal.hidden = true;
    loadFeed();
});

areaToggleBtn.addEventListener('click', initAreaPicker);

let searchDebounce = null;
function openSearch() {
    searchBar.classList.add('active');
    searchInput.focus();
}
function closeSearch() {
    searchBar.classList.remove('active');
    searchInput.value = '';
    loadFeed();
}

searchToggleBtn.addEventListener('click', () => {
    searchBar.classList.contains('active') ? closeSearch() : openSearch();
});
searchCloseBtn.addEventListener('click', closeSearch);
searchInput.addEventListener('input', () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => loadFeed(searchInput.value), 350);
});

window.addEventListener('DOMContentLoaded', () => {
    const sharedVideoId = new URLSearchParams(location.search).get('v');
    if (sharedVideoId) {
        loadFeedWithSharedVideo(sharedVideoId);
    } else if (getSelectedArea()) {
        loadFeed();
    } else {
        initAreaPicker();
    }
});
