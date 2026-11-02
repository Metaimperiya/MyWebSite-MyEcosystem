// ================================================================
// МАРКЕТПЛЕЙС: ТОВАРЫ, УСЛУГИ, НЕДВИЖИМОСТЬ, КНИГИ И КУРСЫ
// ================================================================
var marketplaceListings = {};
var marketplaceTab = 'goods';
var marketplaceEditingId = null;
var marketplaceImagePreviewUrl = null;
var marketplaceImageCleared = false;
var marketplaceDealModeFilter = 'all';
var cpm2ShowcaseTab = 'trending';
var cpm2ShowcaseListings = {};
var cpm2ShowcaseGroups = {};
var cpm2ShowcaseStartTimer = null;
var cpm2ShowcaseTimer = null;

var MARKETPLACE_CATEGORIES = {
    goods: ['Авто и запчасти', 'Электроника', 'Бытовая техника', 'Дом и сад', 'Одежда и аксессуары', 'Другое'],
    services: ['Ремонт и строительство', 'Красота и здоровье', 'Обучение', 'Перевозки и доставка', 'Цифровые и бизнес-услуги', 'Другое'],
    realestate: ['Продажа', 'Долгосрочная аренда', 'Посуточно', 'Хостел']
};

function marketEscape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
}

function marketUrl(value) {
    if (!value) return '';
    try {
        var parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
    } catch (error) { return ''; }
}

window.loadMarketplace = function() {
    var grid = document.getElementById('marketplaceGrid');
    if (!grid) return;
    if (typeof setupDatingCountries === 'function') setupDatingCountries();
    if (!USER_UID) { grid.innerHTML = '<div class="marketplace-empty">Войди, чтобы просматривать и публиковать объявления.</div>'; return; }
    grid.innerHTML = '<div class="marketplace-empty">Загружаем объявления…</div>';
    db.ref('sites/' + SITE + '/marketplace_listings').once('value').then(function(snapshot) {
        marketplaceListings = snapshot.val() || {};
        renderMarketplace();
    }).catch(function(error) {
        console.error('Не удалось загрузить маркетплейс:', error);
        grid.innerHTML = '<div class="marketplace-empty">Не удалось загрузить объявления. Проверь Database Rules.</div>';
    });
};

window.loadCpm2MarketShowcase = function() {
    var section = document.getElementById('cpm2MarketShowcase');
    if (!section || !USER_UID) { if (section) section.hidden = true; return; }
    section.hidden = false;
    var status = document.getElementById('cpm2MarketStatus');
    if (status) status.textContent = 'Загружаем предложения CPM2…';
    Promise.all([
        db.ref('sites/' + SITE + '/marketplace_listings').once('value'),
        db.ref('sites/' + SITE + '/groups').once('value'),
        db.ref('sites/' + SITE + '/group_members').once('value')
    ]).then(function(snapshots) {
        cpm2ShowcaseListings = snapshots[0].val() || {};
        cpm2ShowcaseGroups = snapshots[1].val() || {};
        var members = snapshots[2].val() || {};
        Object.keys(cpm2ShowcaseGroups).forEach(function(id) {
            cpm2ShowcaseGroups[id]._memberCount = Object.keys(members[id] || {}).length;
        });
        renderCpm2MarketShowcase();
    }).catch(function(error) {
        console.warn('Не удалось загрузить витрину CPM2:', error);
        if (status) status.textContent = 'Не удалось загрузить витрину. Попробуй обновить страницу.';
    });
};

window.showCpm2MarketTab = function(tab) {
    if (['trending', 'sell', 'trade', 'clans'].indexOf(tab) === -1) return;
    cpm2ShowcaseTab = tab;
    document.querySelectorAll('[data-cpm2-market-tab]').forEach(function(button) {
        button.classList.toggle('active', button.getAttribute('data-cpm2-market-tab') === tab);
    });
    renderCpm2MarketShowcase();
};

function cpm2ShowcaseEscape(value) { return marketEscape(value); }

function cpm2AutoListings(mode) {
    return Object.keys(cpm2ShowcaseListings).map(function(id) {
        return Object.assign({ id: id }, cpm2ShowcaseListings[id] || {});
    }).filter(function(item) {
        if (!item.isActive || item.cpm2Broker !== true || item.kind !== 'goods' || item.category !== 'Авто и запчасти') return false;
        var dealMode = item.dealMode === 'trade' ? 'trade' : 'sell';
        return mode === 'all' || mode === dealMode;
    }).sort(function(a, b) {
        if (mode === 'trending') {
            return (Number(b.updatedAt) || Number(b.createdAt) || 0) - (Number(a.updatedAt) || Number(a.createdAt) || 0);
        }
        return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    }).slice(0, 12);
}

function renderCpm2MarketShowcase() {
    var viewport = document.getElementById('cpm2MarketViewport');
    var status = document.getElementById('cpm2MarketStatus');
    var selected = document.getElementById('cpm2MarketSelected');
    if (!viewport || !status) return;
    clearTimeout(cpm2ShowcaseStartTimer);
    clearInterval(cpm2ShowcaseTimer);
    if (selected) { selected.hidden = true; selected.innerHTML = ''; }
    var cards = [];
    if (cpm2ShowcaseTab === 'clans') {
        cards = Object.keys(cpm2ShowcaseGroups).map(function(id) {
            return Object.assign({ id: id }, cpm2ShowcaseGroups[id] || {});
        }).filter(function(group) { return group.isClan === true; })
            .sort(function(a, b) { return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0); }).slice(0, 12);
        status.textContent = cards.length ? 'Кланы CPM2 · ' + cards.length + ' сообществ' : 'Кланы CPM2';
        viewport.innerHTML = cards.length ? '<div class="cpm2-market-track">' + cards.map(function(group) {
            var image = marketUrl(group.coverUrl || group.avatarUrl);
            var badge = group.clanBadge || '♟';
            return '<button type="button" class="cpm2-market-card cpm2-clan-card" data-cpm2-clan="' + cpm2ShowcaseEscape(group.id) + '"><span class="cpm2-market-card-image">' + (image ? '<img src="' + cpm2ShowcaseEscape(image) + '" alt="" loading="lazy">' : '<span>' + cpm2ShowcaseEscape(badge) + '</span>') + '<span class="cpm2-market-card-shade"></span></span><span class="cpm2-market-card-badge">♟ CLAN</span><span class="cpm2-market-card-copy"><strong>' + cpm2ShowcaseEscape(group.name || 'Клан CPM2') + '</strong><small>' + cpm2ShowcaseEscape(group._memberCount || 0) + ' участников</small><em>Открыть →</em></span></button>';
        }).join('') + '</div>' : '<div class="cpm2-market-empty">Пока нет созданных кланов. Открой раздел Clans и создай первый.</div>';
        viewport.querySelectorAll('[data-cpm2-clan]').forEach(function(button) {
            button.addEventListener('click', function() { window.openCpm2ShowcaseClan(button.getAttribute('data-cpm2-clan')); });
        });
        startCpm2Carousel(viewport);
        return;
    }
    var mode = cpm2ShowcaseTab === 'sell' ? 'sell' : cpm2ShowcaseTab === 'trade' ? 'trade' : 'trending';
    cards = cpm2AutoListings(mode);
    var title = cpm2ShowcaseTab === 'sell' ? 'Продажа автомобилей' : cpm2ShowcaseTab === 'trade' ? 'Обмен автомобилей' : 'Свежие предложения CPM2';
    status.textContent = cards.length ? title + ' · ' + cards.length + (cards.length === 1 ? ' объявление' : ' объявлений') : title;
    viewport.innerHTML = cards.length ? '<div class="cpm2-market-track">' + cards.map(function(item) {
        var image = marketUrl(item.imageUrl);
        var deal = item.dealMode === 'trade' ? 'TRADE · ОБМЕН' : 'SELL · ПРОДАЖА';
        var value = item.dealMode === 'trade' ? (item.tradeFor || 'Обмен предложениями') : (item.price ? item.price + ' ' + (item.currency || '') : 'Цена по договорённости');
        return '<button type="button" class="cpm2-market-card" data-cpm2-listing="' + cpm2ShowcaseEscape(item.id) + '"><span class="cpm2-market-card-image">' + (image ? '<img src="' + cpm2ShowcaseEscape(image) + '" alt="" loading="lazy">' : '<span>🚘</span>') + '<span class="cpm2-market-card-shade"></span></span><span class="cpm2-market-card-badge">' + deal + '</span><span class="cpm2-market-card-copy"><strong>' + cpm2ShowcaseEscape(item.title || 'Автомобиль CPM2') + '</strong><small>' + cpm2ShowcaseEscape(item.city || '') + (item.country ? ', ' + cpm2ShowcaseEscape(item.country) : '') + '</small><em>' + cpm2ShowcaseEscape(value) + '</em></span></button>';
    }).join('') + '</div>' : '<div class="cpm2-market-empty">Здесь пока пусто. Размести первое объявление CPM2.</div>';
    viewport.querySelectorAll('[data-cpm2-listing]').forEach(function(button) {
        button.addEventListener('click', function() { renderCpm2SelectedListing(button.getAttribute('data-cpm2-listing')); });
    });
    startCpm2Carousel(viewport);
}

function startCpm2Carousel(viewport) {
    if (!viewport || !viewport.querySelector('.cpm2-market-card') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cpm2ShowcaseStartTimer = setTimeout(function() {
        cpm2ShowcaseTimer = setInterval(function() {
            if (!viewport.isConnected || viewport.matches(':hover') || viewport.contains(document.activeElement)) return;
            var card = viewport.querySelector('.cpm2-market-card');
            if (!card || viewport.scrollWidth <= viewport.clientWidth + 2) return;
            var step = card.getBoundingClientRect().width + 10;
            var end = viewport.scrollWidth - viewport.clientWidth;
            if (viewport.scrollLeft >= end - step / 2) viewport.scrollTo({ left: 0, behavior: 'smooth' });
            else viewport.scrollBy({ left: step, behavior: 'smooth' });
        }, 9000);
    }, 5000);
}

function renderCpm2SelectedListing(id) {
    var selected = document.getElementById('cpm2MarketSelected');
    var item = cpm2ShowcaseListings[id];
    if (!selected || !item) return;
    var key = 'market_' + id;
    var isTrade = item.dealMode === 'trade';
    selected.innerHTML = '<div class="cpm2-market-selected-head"><div><h3>' + cpm2ShowcaseEscape(item.title || 'Автомобиль CPM2') + '</h3><span class="cpm2-market-selected-meta">' + (isTrade ? '⇄ Trade · ' + cpm2ShowcaseEscape(item.tradeFor || 'Обмен предложениями') : '↗ Sell') + ' · ' + cpm2ShowcaseEscape(item.city || '') + (item.country ? ', ' + cpm2ShowcaseEscape(item.country) : '') + '</span></div><strong class="cpm2-market-selected-price">' + (isTrade ? 'ОБМЕН' : cpm2ShowcaseEscape(item.price ? item.price + ' ' + (item.currency || '') : 'По договорённости')) + '</strong></div><p>' + cpm2ShowcaseEscape(item.description || '') + '</p><div class="cpm2-market-selected-actions"><button type="button" onclick="viewUserProfile(\'' + cpm2ShowcaseEscape(item.sellerUid) + '\')">Профиль продавца</button><button type="button" class="cpm2-market-comment-toggle" onclick="toggleComments(\'' + key + '\',\'marketplace\')">💬 Комментарии <span id="commentCount_' + key + '">' + Number(item.commentCount || 0) + '</span></button><button type="button" onclick="goToCpm2Market(\'' + (isTrade ? 'trade' : 'sell') + '\')">Все ' + (isTrade ? 'обмены' : 'продажи') + ' →</button></div><div class="comments-wrapper" id="commentsWrapper_' + key + '" style="display:none"><div class="comments"><div class="comments-body"><div class="comments-list"><div id="commentsContainer_' + key + '"></div></div></div></div></div><div class="comment-input-wrap"><input type="text" id="commentInput_' + key + '" maxlength="1000" placeholder="Написать комментарий…" onkeydown="if(event.key===\'Enter\')submitComment(\'' + key + '\',\'marketplace\')"><button type="button" onclick="if(window.checkAccess())submitComment(\'' + key + '\',\'marketplace\')" aria-label="Отправить комментарий">→</button></div>';
    selected.hidden = false;
}

window.openCpm2ShowcaseClan = function(id) {
    if (!window.checkAccess()) return;
    window.goToGroups();
    db.ref('sites/' + SITE + '/groups/' + id).once('value').then(function(snapshot) {
        if (!snapshot.exists()) return;
        groupsCache[id] = snapshot.val();
        window.openGroup(id);
    });
};

window.showMarketplaceTab = function(tab) {
    if (['goods', 'services', 'realestate', 'library'].indexOf(tab) === -1) return;
    marketplaceTab = tab;
    document.querySelectorAll('[data-market-tab]').forEach(function(button) {
        button.classList.toggle('active', button.getAttribute('data-market-tab') === tab);
    });
    var library = document.getElementById('marketplaceLibrary');
    var grid = document.getElementById('marketplaceGrid');
    var filters = document.getElementById('marketplaceFilters');
    var summary = document.getElementById('marketplaceSummary');
    var create = document.getElementById('marketplaceCreateButton');
    var dealFilter = document.getElementById('marketplaceDealModeFilter');
    var isLibrary = tab === 'library';
    if (library) library.hidden = !isLibrary;
    if (grid) grid.hidden = isLibrary;
    if (filters) filters.hidden = isLibrary;
    if (summary) summary.hidden = isLibrary;
    if (create) create.hidden = isLibrary;
    if (dealFilter) {
        dealFilter.hidden = isLibrary || tab !== 'goods';
        dealFilter.value = marketplaceDealModeFilter;
    }
    renderMarketplace();
};

function renderMarketplace() {
    var grid = document.getElementById('marketplaceGrid');
    var library = document.getElementById('marketplaceLibrary');
    if (!grid) return;
    if (marketplaceTab === 'library') {
        if (library) library.innerHTML = '<div class="marketplace-library-intro"><span>КНИЖНЫЙ КЛУБ</span><h2>Книги и курсы</h2><p>Каталоги подключим к твоим готовым меню с другого сайта, чтобы посетители сразу переходили к уже опубликованным материалам.</p></div><div class="marketplace-library-grid"><article><div class="marketplace-library-icon">📚</div><h3>Книжный клуб</h3><p>Каталог книг и подборок.</p><span class="marketplace-library-pending">Жду индексное меню книг</span></article><article><div class="marketplace-library-icon">🎓</div><h3>Курсы</h3><p>Каталог обучающих программ.</p><span class="marketplace-library-pending">Жду индексное меню курсов</span></article></div>';
        return;
    }
    var countryInput = document.getElementById('marketplaceCountry');
    var countryText = (countryInput ? countryInput.value : '').trim().toLocaleLowerCase('ru');
    var cityText = (document.getElementById('marketplaceCity').value || '').trim().toLocaleLowerCase('ru');
    var query = (document.getElementById('marketplaceSearch').value || '').trim().toLocaleLowerCase('ru');
    var selectedCountry = typeof datingCountryCode === 'function' ? datingCountryCode(countryText) : null;
    var items = Object.keys(marketplaceListings).map(function(id) { return Object.assign({ id: id }, marketplaceListings[id] || {}); })
        .filter(function(item) {
            if (item.kind !== marketplaceTab || item.isActive !== true) return false;
            if (marketplaceDealModeFilter !== 'all') {
                if (item.category !== 'Авто и запчасти') return false;
                if (item.cpm2Broker !== true) return false;
                var itemMode = item.dealMode === 'trade' ? 'trade' : 'sell';
                if (itemMode !== marketplaceDealModeFilter) return false;
            }
            if (item.sellerUid !== USER_UID && !item.isActive) return false;
            var text = [item.title, item.description, item.category, item.city, item.country].join(' ').toLocaleLowerCase('ru');
            if (query && text.indexOf(query) === -1) return false;
            if (selectedCountry && item.countryCode !== selectedCountry.code) return false;
            if (countryText && !selectedCountry && !(item.country || '').toLocaleLowerCase('ru').includes(countryText)) return false;
            if (cityText && !(item.city || '').toLocaleLowerCase('ru').includes(cityText)) return false;
            return true;
        }).sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    grid.innerHTML = items.length ? items.map(renderMarketplaceCard).join('') : '<div class="marketplace-empty"><span>🛍️</span><strong>Объявлений пока нет</strong><p>Размести первое — оно появится в этой категории.</p><button type="button" class="marketplace-primary" onclick="openMarketplaceListing()">＋ Разместить объявление</button></div>';
    var summary = document.getElementById('marketplaceSummary');
    if (summary) summary.textContent = items.length + (items.length === 1 ? ' объявление' : items.length > 1 && items.length < 5 ? ' объявления' : ' объявлений');
    grid.querySelectorAll('[data-market-open]').forEach(function(card) { card.onclick = function() { openMarketplaceDetail(card.getAttribute('data-market-open')); }; });
    grid.querySelectorAll('[data-market-edit]').forEach(function(button) { button.onclick = function(event) { event.stopPropagation(); openMarketplaceListing(button.getAttribute('data-market-edit')); }; });
    grid.querySelectorAll('[data-market-archive]').forEach(function(button) { button.onclick = function(event) { event.stopPropagation(); archiveMarketplaceListing(button.getAttribute('data-market-archive')); }; });
    var create = document.getElementById('marketplaceCreateButton');
    if (create) create.textContent = marketplaceTab === 'goods' ? '＋ Продать товар' : marketplaceTab === 'services' ? '＋ Предложить услугу' : '＋ Объявление';
}

function renderMarketplaceCard(item) {
    var image = marketUrl(item.imageUrl);
    var price = item.price ? marketEscape(item.price) + ' ' + marketEscape(item.currency || '') : 'Цена по договорённости';
    var extra = item.kind === 'realestate' ? [item.dealType, item.propertyType, item.rooms ? item.rooms + ' комн.' : '', item.area].filter(Boolean).join(' · ') : item.category;
    return '<article class="marketplace-card"><button type="button" class="marketplace-card-open" data-market-open="' + marketEscape(item.id) + '"><span class="marketplace-card-image">' + (image ? '<img src="' + marketEscape(image) + '" alt="">' : '<span>' + (item.kind === 'realestate' ? '🏠' : item.kind === 'services' ? '🧰' : '📦') + '</span>') + '</span><span class="marketplace-card-copy"><span class="marketplace-card-category">' + marketEscape(extra) + '</span><strong>' + marketEscape(item.title) + '</strong><span class="marketplace-card-price">' + price + '</span><span class="marketplace-card-location">📍 ' + marketEscape(item.city) + ', ' + marketEscape(item.country) + '</span></span></button>' + (item.sellerUid === USER_UID ? '<div class="marketplace-card-owner"><button type="button" data-market-edit="' + marketEscape(item.id) + '">Изменить</button><button type="button" data-market-archive="' + marketEscape(item.id) + '">Удалить</button></div>' : '') + '</article>';
}

function updateMarketplaceCategories(preselect) {
    var kind = document.getElementById('marketplaceKind').value;
    var select = document.getElementById('marketplaceCategory');
    select.innerHTML = (MARKETPLACE_CATEGORIES[kind] || []).map(function(category) { return '<option>' + marketEscape(category) + '</option>'; }).join('');
    document.getElementById('marketplacePropertyFields').hidden = kind !== 'realestate';
    var title = document.getElementById('marketplaceModalTitle');
    if (!marketplaceEditingId) title.textContent = kind === 'goods' ? 'Новое объявление о товаре' : kind === 'services' ? 'Новое предложение услуги' : 'Объявление о недвижимости';
    if (preselect) select.value = preselect;
    syncMarketplaceDealMode();
}

window.openMarketplaceListing = function(id) {
    marketplaceEditingId = id || null;
    marketplaceImageCleared = false;
    var item = id ? marketplaceListings[id] : {};
    if (id && (!item || item.sellerUid !== USER_UID)) return;
    var defaultKind = id ? item.kind : (['goods', 'services', 'realestate'].indexOf(marketplaceTab) !== -1 ? marketplaceTab : 'goods');
    document.getElementById('marketplaceKind').value = defaultKind;
    updateMarketplaceCategories(id ? item.category : null);
    document.getElementById('marketplaceDealMode').value = item.dealMode === 'trade' ? 'trade' : 'sell';
    document.getElementById('marketplaceTradeFor').value = item.tradeFor || '';
    syncMarketplaceDealMode();
    document.getElementById('marketplaceModalTitle').textContent = id ? 'Изменить объявление' : document.getElementById('marketplaceModalTitle').textContent;
    document.getElementById('marketplaceTitle').value = item.title || '';
    document.getElementById('marketplacePrice').value = item.price || '';
    document.getElementById('marketplaceCurrency').value = item.currency || 'UAH';
    document.getElementById('marketplaceCountryInput').value = item.country || '';
    document.getElementById('marketplaceCityInput').value = item.city || '';
    document.getElementById('marketplaceImageUrl').value = item.imageUrl || '';
    document.getElementById('marketplaceDescription').value = item.description || '';
    document.getElementById('marketplaceDealType').value = item.dealType || 'Продажа';
    document.getElementById('marketplacePropertyType').value = item.propertyType || 'Квартира';
    document.getElementById('marketplaceRooms').value = item.rooms || '';
    document.getElementById('marketplaceArea').value = item.area || '';
    document.getElementById('marketplaceImageFile').value = '';
    document.getElementById('marketplaceError').textContent = '';
    document.getElementById('marketplaceSaveButton').textContent = id ? 'Сохранить изменения' : 'Опубликовать';
    renderMarketplaceImagePreview(item.imageUrl || '');
    document.getElementById('marketplaceListingModal').classList.add('open');
};

function renderMarketplaceImagePreview(url) {
    var preview = document.getElementById('marketplaceImagePreview');
    if (!preview) return;
    preview.replaceChildren();
    if (!url) { preview.hidden = true; return; }
    var image = document.createElement('img');
    image.src = url;
    image.alt = 'Предпросмотр фотографии объявления';
    preview.appendChild(image);
    preview.hidden = false;
}

window.saveMarketplaceListing = function() {
    var error = document.getElementById('marketplaceError');
    var button = document.getElementById('marketplaceSaveButton');
    var kind = document.getElementById('marketplaceKind').value;
    var category = document.getElementById('marketplaceCategory').value;
    var title = document.getElementById('marketplaceTitle').value.trim();
    var description = document.getElementById('marketplaceDescription').value.trim();
    var country = typeof datingCountryCode === 'function' ? datingCountryCode(document.getElementById('marketplaceCountryInput').value) : null;
    var city = document.getElementById('marketplaceCityInput').value.trim();
    var imageUrl = document.getElementById('marketplaceImageUrl').value.trim();
    var imageFile = document.getElementById('marketplaceImageFile').files[0];
    if (title.length < 2 || !description || !category || !country || !city) { error.textContent = 'Добавь название, описание, категорию, страну и город.'; return; }
    if (imageUrl && !marketUrl(imageUrl) && !imageFile) { error.textContent = 'Для фото укажи прямую ссылку http:// или https://.'; return; }
    if (imageFile && (!imageFile.type.match(/^image\//i) || imageFile.size >= 5 * 1024 * 1024)) { error.textContent = 'Выбери изображение размером меньше 5 МБ.'; return; }
    var id = marketplaceEditingId || db.ref('sites/' + SITE + '/marketplace_listings').push().key;
    var previous = marketplaceListings[id] || {};
    var item = {
        kind: kind, category: category, title: title, description: description,
        price: document.getElementById('marketplacePrice').value.trim(), currency: document.getElementById('marketplaceCurrency').value,
        country: country.name, countryCode: country.code, city: city, imageUrl: marketUrl(imageUrl) || (marketplaceImageCleared ? '' : previous.imageUrl || ''),
        sellerUid: USER_UID, authorUid: USER_UID, createdAt: previous.createdAt || Date.now(), isActive: true
    };
    if (kind === 'goods' && category === 'Авто и запчасти') {
        item.dealMode = document.getElementById('marketplaceDealMode').value === 'trade' ? 'trade' : 'sell';
        item.tradeFor = item.dealMode === 'trade' ? document.getElementById('marketplaceTradeFor').value.trim() : '';
    }
    if (kind === 'realestate') {
        item.dealType = document.getElementById('marketplaceDealType').value;
        item.propertyType = document.getElementById('marketplacePropertyType').value;
        item.rooms = document.getElementById('marketplaceRooms').value.trim();
        item.area = document.getElementById('marketplaceArea').value.trim();
    }
    button.disabled = true;
    button.textContent = imageFile ? 'Загружаю фото…' : 'Сохраняю…';
    var imagePromise = imageFile
        ? storage.ref('marketplace-photos/' + USER_UID + '/' + id + '/main').put(imageFile, { contentType: imageFile.type }).then(function(snapshot) { return snapshot.ref.getDownloadURL(); })
        : Promise.resolve(item.imageUrl);
    imagePromise.then(function(url) {
        item.imageUrl = url;
        var listingRef = db.ref('sites/' + SITE + '/marketplace_listings/' + id);
        return marketplaceEditingId ? listingRef.update(item) : listingRef.set(item);
    }).then(function() {
        marketplaceListings[id] = item;
        marketplaceEditingId = null;
        window.closeMarketplaceModal();
        renderMarketplace();
    }).catch(function(saveError) {
        console.error('Не удалось сохранить объявление:', saveError);
        error.textContent = saveError.code === 'storage/bucket-not-found' || saveError.code === 'storage/unauthorized' || saveError.code === 'storage/unauthenticated'
            ? 'Firebase Storage ещё не настроено. Вставь ссылку на фото или включи Storage.'
            : saveError.code === 'PERMISSION_DENIED' ? 'Firebase запретил запись. Опубликуй Database Rules для маркетплейса.' : 'Не удалось сохранить объявление.';
    }).finally(function() { button.disabled = false; button.textContent = marketplaceEditingId ? 'Сохранить изменения' : 'Опубликовать'; });
};

function openMarketplaceDetail(id) {
    var item = marketplaceListings[id];
    if (!item) return;
    var content = document.getElementById('marketplaceDetailContent');
    var image = marketUrl(item.imageUrl);
    var isOwner = item.sellerUid === USER_UID;
    var subdetails = item.kind === 'realestate'
        ? '<div class="marketplace-detail-facts"><span>' + marketEscape(item.dealType || '') + '</span><span>' + marketEscape(item.propertyType || '') + '</span>' + (item.rooms ? '<span>' + marketEscape(item.rooms) + ' комнат</span>' : '') + (item.area ? '<span>' + marketEscape(item.area) + '</span>' : '') + '</div>' : '';
    content.innerHTML = (image ? '<img class="marketplace-detail-image" src="' + marketEscape(image) + '" alt="">' : '') + '<span class="marketplace-card-category">' + marketEscape(item.category) + '</span><h2>' + marketEscape(item.title) + '</h2><strong class="marketplace-detail-price">' + (item.price ? marketEscape(item.price) + ' ' + marketEscape(item.currency) : 'Цена по договорённости') + '</strong><p class="marketplace-card-location">📍 ' + marketEscape(item.city) + ', ' + marketEscape(item.country) + '</p>' + subdetails + '<p class="marketplace-detail-description">' + marketEscape(item.description).replace(/\n/g, '<br>') + '</p>' + (isOwner ? '<div class="marketplace-detail-actions"><button class="marketplace-primary" type="button" data-detail-edit="' + marketEscape(id) + '">Изменить</button><button class="marketplace-secondary" type="button" data-detail-archive="' + marketEscape(id) + '">Снять с публикации</button></div>' : '<button class="marketplace-primary" type="button" data-contact-seller="' + marketEscape(item.sellerUid) + '">Связаться с продавцом</button>');
    document.getElementById('marketplaceDetailModal').classList.add('open');
    var edit = content.querySelector('[data-detail-edit]');
    if (edit) edit.onclick = function() { closeMarketplaceDetail(); openMarketplaceListing(id); };
    var archive = content.querySelector('[data-detail-archive]');
    if (archive) archive.onclick = function() { archiveMarketplaceListing(id); };
    var contact = content.querySelector('[data-contact-seller]');
    if (contact) contact.onclick = function() { closeMarketplaceDetail(); if (typeof viewUserProfile === 'function') viewUserProfile(item.sellerUid); };
}

function archiveMarketplaceListing(id) {
    var item = marketplaceListings[id];
    if (!item || item.sellerUid !== USER_UID || !confirm('Удалить объявление?')) return;
    closeMarketplaceDetail();
    db.ref('sites/' + SITE + '/marketplace_listings/' + id).remove().then(function() {
        delete marketplaceListings[id];
        renderMarketplace();
    }).catch(function(error) {
        console.error('Не удалось снять объявление:', error);
        alert('Не удалось удалить объявление. Проверь Database Rules.');
    });
}

window.closeMarketplaceModal = function() {
    document.getElementById('marketplaceListingModal').classList.remove('open');
    if (marketplaceImagePreviewUrl) URL.revokeObjectURL(marketplaceImagePreviewUrl);
    marketplaceImagePreviewUrl = null;
    marketplaceEditingId = null;
};
window.closeMarketplaceDetail = function() { document.getElementById('marketplaceDetailModal').classList.remove('open'); };

document.getElementById('marketplaceKind').addEventListener('change', function() { updateMarketplaceCategories(); });
['marketplaceSearch', 'marketplaceCountry', 'marketplaceCity'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', renderMarketplace);
});
var marketImageUrl = document.getElementById('marketplaceImageUrl');
marketImageUrl.addEventListener('input', function() {
    document.getElementById('marketplaceImageFile').value = '';
    marketplaceImageCleared = !marketImageUrl.value.trim();
    if (marketplaceImagePreviewUrl) URL.revokeObjectURL(marketplaceImagePreviewUrl);
    marketplaceImagePreviewUrl = null;
    renderMarketplaceImagePreview(marketUrl(marketImageUrl.value.trim()));
});
document.getElementById('marketplaceImageFile').addEventListener('change', function(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.match(/^image\//i) || file.size >= 5 * 1024 * 1024) {
        document.getElementById('marketplaceError').textContent = !file.type.match(/^image\//i) ? 'Выбери файл изображения.' : 'Размер фото должен быть меньше 5 МБ.';
        event.target.value = '';
        return;
    }
    document.getElementById('marketplaceError').textContent = '';
    marketImageUrl.value = '';
    marketplaceImageCleared = false;
    if (marketplaceImagePreviewUrl) URL.revokeObjectURL(marketplaceImagePreviewUrl);
    marketplaceImagePreviewUrl = URL.createObjectURL(file);
    renderMarketplaceImagePreview(marketplaceImagePreviewUrl);
});

window.goToAutoMarket = function() {
    marketplaceDealModeFilter = 'all';
    var dealFilter = document.getElementById('marketplaceDealModeFilter');
    if (dealFilter) dealFilter.value = 'all';
    var search = document.getElementById('marketplaceSearch');
    if (search) search.value = 'авто';
    window.showMarketplaceTab('goods');
    window.goToMarketplace();
};

function syncMarketplaceDealMode() {
    var kind = document.getElementById('marketplaceKind');
    var category = document.getElementById('marketplaceCategory');
    var wrap = document.getElementById('marketplaceDealModeWrap');
    var tradeFor = document.getElementById('marketplaceTradeForWrap');
    var isCarListing = kind && category && kind.value === 'goods' && category.value === 'Авто и запчасти';
    if (wrap) wrap.hidden = !isCarListing;
    if (tradeFor) tradeFor.hidden = !isCarListing || document.getElementById('marketplaceDealMode').value !== 'trade';
}

document.getElementById('marketplaceCategory').addEventListener('change', syncMarketplaceDealMode);
document.getElementById('marketplaceDealMode').addEventListener('change', syncMarketplaceDealMode);
document.getElementById('marketplaceDealModeFilter').addEventListener('change', function() {
    marketplaceDealModeFilter = this.value;
    renderMarketplace();
});

window.goToCpm2Market = function(mode) {
    marketplaceDealModeFilter = ['sell', 'trade'].indexOf(mode) !== -1 ? mode : 'all';
    var dealFilter = document.getElementById('marketplaceDealModeFilter');
    if (dealFilter) dealFilter.value = marketplaceDealModeFilter;
    marketplaceTab = 'goods';
    var search = document.getElementById('marketplaceSearch');
    if (search) search.value = '';
    window.goToMarketplace();
    window.showMarketplaceTab('goods');
};
