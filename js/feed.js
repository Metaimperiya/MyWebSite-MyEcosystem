// ===== ЛЕНТА =====

function loadFeed() {
    db.ref('sites/' + SITE + '/feed_posts').orderByChild('timestamp').on('value', snap => {
        const container = document.getElementById('feedPosts');
        container.innerHTML = '';
        
        const data = snap.val() || {};
        const keys = Object.keys(data).sort((a, b) => (data[b].timestamp || 0) - (data[a].timestamp || 0));
        
        if (!keys.length) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:#65676b;">Пока пусто</div>';
            return;
        }
        
        keys.forEach(k => {
            const p = data[k];
            p.id = k;
            container.appendChild(renderFeedPost(p));
        });
        
        // Показываем форму для админа
        const form = document.getElementById('feedForm');
        if (form) {
            form.style.display = isAdmin ? 'block' : 'none';
        }
    });
}

function renderFeedPost(p) {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.marginBottom = '10px';
    
    const mq = p.marquee ? 
        `<div style="background:#f5f5f5;padding:4px 10px;border-radius:6px;color:#e67e22;font-weight:600;margin-bottom:4px;overflow:hidden;white-space:nowrap;">
            <span style="display:inline-block;animation:scrollMarquee 12s linear infinite;padding-left:100%;">${esc(p.marquee)}</span>
        </div>` : '';
    
    const fr = p.link ? 
        `<iframe src="${esc(p.link)}" style="width:100%;height:180px;border:1px solid #e0e0e0;border-radius:8px;margin:4px 0;"></iframe>` : '';
    
    let btns = '';
    if (p.buttons && p.buttons.length) {
        btns = p.buttons.filter(b => b.url).map(b => 
            `<a href="${esc(b.url)}" target="_blank" style="display:inline-block;background:#e67e22;color:#fff;padding:4px 14px;border-radius:40px;text-decoration:none;font-weight:700;font-size:12px;margin:2px 4px 2px 0;">${esc(b.label || '🔗')}</a>`
        ).join('');
    }
    
    let tags = '';
    if (p.hashtags && p.hashtags.length) {
        tags = p.hashtags.map(t => 
            `<span style="color:#1877f2;font-size:11px;background:#f0f7ff;padding:0 8px;border-radius:20px;border:1px solid #d0e4ff;display:inline-block;margin:2px;">${esc(t)}</span>`
        ).join(' ');
    }
    
    let actions = '';
    if (isAdmin) {
        actions = `
            <div style="margin-top:6px;display:flex;gap:4px;">
                <button onclick="feedEdit('${p.id}')" style="background:#f0f0f0;border:1px solid #ddd;padding:2px 12px;border-radius:20px;cursor:pointer;font-size:11px;">✏️</button>
                <button onclick="feedDel('${p.id}')" style="background:#f0f0f0;border:1px solid #ddd;padding:2px 12px;border-radius:20px;cursor:pointer;font-size:11px;">🗑</button>
            </div>
        `;
    }
    
    div.innerHTML = `
        ${mq}
        <div>
            <span style="font-weight:700;color:#e67e22;">${esc(p.author || 'Аноним')}</span>
            <span style="color:#999;font-size:11px;margin-left:6px;">${p.time || ''}${p.edited ? ' (ред.)' : ''}</span>
        </div>
        <div style="margin:4px 0;line-height:1.5;">${esc(p.text || '')}</div>
        ${btns}
        ${fr}
        <div style="margin-top:4px;">${tags}</div>
        ${actions}
        <button onclick="openPrivateChat('${p.authorUid || ''}')" style="background:#f0f0f0;border:1px solid #ddd;color:#1877f2;padding:2px 14px;border-radius:40px;font-size:11px;cursor:pointer;margin-top:4px;">💬 Обсудить</button>
    `;
    
    return div;
}

let feedEditId = null;

function fAddBtn(l = '', u = '') {
    const c = document.getElementById('fBtns');
    if (!c) return;
    const d = document.createElement('div');
    d.style.display = 'flex';
    d.style.gap = '4px';
    d.style.marginBottom = '4px';
    d.innerHTML = `
        <input placeholder="Текст" value="${esc(l)}" style="flex:1;padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-family:inherit;">
        <input placeholder="Ссылка" value="${esc(u)}" style="flex:1;padding:4px 8px;border:1px solid #ddd;border-radius:4px;font-family:inherit;">
        <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:#e74c3c;cursor:pointer;">✕</button>
    `;
    c.appendChild(d);
}

function fSubmit() {
    if (!USER) { alert('Войдите!'); return; }
    
    const marquee = document.getElementById('fMarquee').value.trim();
    const text = document.getElementById('fText').value.trim();
    const link = document.getElementById('fLink').value.trim();
    const hr = document.getElementById('fHashtags').value.trim();
    const hashtags = hr ? hr.split(/\s+/).filter(t => t.startsWith('#')).slice(0, 5) : [];
    
    if (!text && !link) { alert('Введите текст или ссылку'); return; }
    
    const buttons = [];
    document.querySelectorAll('#fBtns > div').forEach(g => {
        const inputs = g.querySelectorAll('input');
        if (inputs[1] && inputs[1].value.trim()) {
            buttons.push({
                label: (inputs[0]?.value.trim() || '🔗'),
                url: inputs[1].value.trim()
            });
        }
    });
    
    const post = {
        author: USER,
        authorUid: USER_UID,
        text: text || '📝',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        marquee: marquee || null,
        link: link || null,
        buttons: buttons,
        hashtags: hashtags,
        edited: false
    };
    
    const ref = db.ref('sites/' + SITE + '/feed_posts');
    if (feedEditId) {
        ref.child(feedEditId).update({ ...post, edited: true, editedAt: Date.now() }).then(fCancel);
    } else {
        ref.push(post).then(fCancel);
    }
}

function fCancel() {
    ['fMarquee', 'fText', 'fLink', 'fHashtags'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const btns = document.getElementById('fBtns');
    if (btns) btns.innerHTML = '';
    const submitBtn = document.getElementById('fSubmitBtn');
    if (submitBtn) submitBtn.textContent = '📤 Опубликовать';
    feedEditId = null;
}

function feedEdit(id) {
    feedEditId = id;
    db.ref('sites/' + SITE + '/feed_posts/' + id).once('value', snap => {
        const p = snap.val();
        if (!p) return;
        
        document.getElementById('fMarquee').value = p.marquee || '';
        document.getElementById('fText').value = p.text || '';
        document.getElementById('fLink').value = p.link || '';
        document.getElementById('fHashtags').value = (p.hashtags || []).join(' ');
        
        const btns = document.getElementById('fBtns');
        if (btns) btns.innerHTML = '';
        (p.buttons || []).forEach(b => fAddBtn(b.label, b.url));
        
        document.getElementById('fSubmitBtn').textContent = '💾 Обновить';
        const form = document.getElementById('feedForm');
        if (form) {
            form.style.display = 'block';
            form.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

function feedDel(id) {
    if (!confirm('Удалить пост?')) return;
    db.ref('sites/' + SITE + '/feed_posts/' + id).remove();
}

// Добавляем CSS для анимации бегущей строки
const styleAnim = document.createElement('style');
styleAnim.textContent = `@keyframes scrollMarquee { 0% { transform:translateX(0); } 100% { transform:translateX(-100%); } }`;
document.head.appendChild(styleAnim);
