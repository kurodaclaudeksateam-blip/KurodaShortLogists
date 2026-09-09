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
    rewind: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 19 2 12 11 5 11 19"/><polygon points="22 19 13 12 22 5 22 19"/></svg>',
    forward: '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 19 22 12 13 5 13 19"/><polygon points="2 19 11 12 2 5 2 19"/></svg>'
};

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
                    ${(item.area || item.tema) ? `<div>${item.area ? `<span class="area-badge">${item.area}</span>` : ''}${item.tema ? `<span class="tema-badge">${item.tema}</span>` : ''}</div>` : ''}
                    <div class="username">KURODA&amp;LOGIST</div>
                    <div class="description">${description}</div>
                </div>

                <div class="interaction-bar">
                    <div class="action-btn ${alreadyLiked ? 'liked' : ''}" data-like-id="${item.id}">
                        <div class="icon-circle">${ICONS.heart}</div>
                        <span class="count">${item.likes || 0}</span>
                    </div>
                    <div class="action-btn">
                        <div class="icon-circle">${ICONS.eye}</div>
                        <span class="count">${item.views || 0}</span>
                    </div>
                </div>

                <div class="playback-controls">
                    <button class="control-btn" data-skip="-5" data-target="${videoId}">${ICONS.rewind}</button>
                    <div class="progress-bar-container" data-seek-target="${videoId}">
                        <div class="progress-fill" id="prog_${videoId}"></div>
                    </div>
                    <button class="control-btn" data-skip="5" data-target="${videoId}">${ICONS.forward}</button>
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
        video.addEventListener('timeupdate', () => {
            const progressId = video.id.replace('vid_', 'prog_');
            const progressBar = document.getElementById(progressId);
            if (progressBar && video.duration) progressBar.style.width = (video.currentTime / video.duration) * 100 + '%';
        });

        wrapper.querySelector('.action-btn[data-like-id]')?.addEventListener('click', function () {
            likeVideo(this.dataset.likeId, this);
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
        .select('id, title, description, tema, area, storage_path, views, likes, created_at')
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
    if (getSelectedArea()) {
        loadFeed();
    } else {
        initAreaPicker();
    }
});
