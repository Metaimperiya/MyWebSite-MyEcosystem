// ================================================================
// МАРКЕТПЛЕЙС: ТОВАРЫ, УСЛУГИ, НЕДВИЖИМОСТЬ, КНИГИ И КУРСЫ
// ================================================================
var marketplaceListings = {};
var marketplaceTab = 'goods';
var marketplaceEditingId = null;
var marketplaceImagePreviewUrl = null;
var marketplaceImageCleared = false;

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
    var isLibrary = tab === 'library';
    if (library) library.hidden = !isLibrary;
    if (grid) grid.hidden = isLibrary;
    if (filters) filters.hidden = isLibrary;
    if (summary) summary.hidden = isLibrary;
    if (create) create.hidden = isLibrary;
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
}

window.openMarketplaceListing = function(id) {
    marketplaceEditingId = id || null;
    marketplaceImageCleared = false;
    var item = id ? marketplaceListings[id] : {};
    if (id && (!item || item.sellerUid !== USER_UID)) return;
    var defaultKind = id ? item.kind : (['goods', 'services', 'realestate'].indexOf(marketplaceTab) !== -1 ? marketplaceTab : 'goods');
    document.getElementById('marketplaceKind').value = defaultKind;
    updateMarketplaceCategories(id ? item.category : null);
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
        sellerUid: USER_UID, createdAt: previous.createdAt || Date.now(), isActive: true
    };
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
        return db.ref('sites/' + SITE + '/marketplace_listings/' + id).set(item);
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
