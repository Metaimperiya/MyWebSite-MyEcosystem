// Админская боковая витрина CPM2: два баннера и закреплённые Sell/Trade объявления.
(function() {
    'use strict';

    var settingsRef = function() { return db.ref('sites/' + SITE + '/cpm2_homepage_showcase'); };
    var storageRoot = 'cpm2-homepage-banners';
    var config = { banners: {}, featured: {} };
    var listings = {};
    var bannerTimers = {};
    var featureLabels = { sell1: 'Sell · место 3', sell2: 'Sell · место 4', sell3: 'Sell · место 5', trade1: 'Trade · место 6', trade2: 'Trade · место 7' };
    var featureBlockNumbers = { sell1: 3, sell2: 4, sell3: 5, trade1: 6, trade2: 7 };
    var isAdminUser = function() { return !!USER_UID && typeof ADMIN_UIDS !== 'undefined' && ADMIN_UIDS.indexOf(USER_UID) !== -1; };
    var localized = function(key, fallback) { return typeof window.t === 'function' ? window.t(key) : fallback; };

    function escape(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
        });
    }

    function safeUrl(value) {
        try {
            var url = new URL(String(value || '').trim());
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
        } catch (error) { return ''; }
    }

    function openEditor(slot) {
        if (typeof window.goToCpm2 === 'function') window.goToCpm2();
        window.setTimeout(function() {
            var editor = document.getElementById('cpm2HomeEditor');
            var details = editor && editor.querySelector('details');
            if (details) details.open = true;
            var target = slot ? document.querySelector('[data-cpm2-editor-target="' + slot + '"]') : editor;
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
    }

    function emptySlot(section, title, description, slot) {
        section.hidden = false;
        var inner = '<span aria-hidden="true">＋</span><strong>' + escape(title) + '</strong><small>' + escape(description) + '</small>' + (isAdminUser() ? '<em>' + escape(localized('landing_banner_upload_cta', 'Нажми, чтобы добавить изображения, текст и ссылку.')) + '</em>' : '');
        section.innerHTML = isAdminUser()
            ? '<button type="button" class="cpm2-showcase-empty" data-cpm2-empty-slot="' + escape(slot) + '">' + inner + '</button>'
            : '<div class="cpm2-showcase-empty cpm2-showcase-empty-public">' + inner + '</div>';
        var button = section.querySelector('[data-cpm2-empty-slot]');
        if (button && isAdminUser()) button.addEventListener('click', function() { openEditor(slot); });
    }

    function activeListings(mode) {
        return Object.keys(listings).map(function(id) { return Object.assign({ id: id }, listings[id] || {}); })
            .filter(function(item) {
                return item.isActive === true && item.cpm2Broker === true && item.moderationStatus === 'approved' && item.brokerStatus === 'in_stock' && item.kind === 'goods' && item.category === 'Авто и запчасти' && (item.dealMode === 'trade' ? 'trade' : 'sell') === mode;
            }).sort(function(a, b) { return Number(b.createdAt || 0) - Number(a.createdAt || 0); });
    }

    function renderBanner(slot, data) {
        var section = document.querySelector('[data-cpm2-banner-slot="' + slot + '"]');
        if (!section) return;
        if (bannerTimers[slot]) clearInterval(bannerTimers[slot]);
        var images = Array.isArray(data && data.images) ? data.images.map(safeUrl).filter(Boolean).slice(0, 5) : [];
        if (!images.length) {
            emptySlot(section, localized('landing_banner_placeholder', 'Здесь могла быть ваша реклама'), localized(slot === 'banner1' ? 'landing_banner1_hint' : 'landing_banner2_hint', slot === 'banner1' ? 'Баннер 1 · слайдер до пяти изображений.' : 'Баннер 2 · широкий рекламный баннер.'), slot);
            section.classList.add('cpm2-banner-empty');
            return;
        }
        section.classList.remove('cpm2-banner-empty');
        section.hidden = false;
        var index = 0;
        function paint() {
            var url = images[index % images.length];
            var content = '<img src="' + escape(url) + '" alt="" loading="lazy"><span class="cpm2-banner-shade"></span><span class="cpm2-banner-copy">' + (data.title ? '<strong>' + escape(data.title) + '</strong>' : '') + (data.text ? '<small>' + escape(data.text) + '</small>' : '') + (data.link ? '<em>Открыть ↗</em>' : '') + '</span><span class="cpm2-banner-count">' + (index % images.length + 1) + ' / ' + images.length + '</span>';
            var link = safeUrl(data.link);
            if (link) section.innerHTML = '<a href="' + escape(link) + '" target="_blank" rel="noopener noreferrer" class="cpm2-banner-slide">' + content + '</a>';
            else section.innerHTML = '<div class="cpm2-banner-slide">' + content + '</div>';
        }
        paint();
        if (images.length > 1) bannerTimers[slot] = setInterval(function() { index = (index + 1) % images.length; paint(); }, 6500);
    }

    function renderFeatureSlot(slot) {
        var section = document.querySelector('[data-cpm2-feature-slot="' + slot + '"]');
        if (!section) return;
        var mode = slot.indexOf('trade') === 0 ? 'trade' : 'sell';
        var picks = Array.isArray(config.featured && config.featured[slot]) ? config.featured[slot].filter(Boolean).slice(0, 3) : [];
        var cards = picks.map(function(id) { return Object.assign({ id: id }, listings[id] || {}); }).filter(function(item) {
            return item.isActive === true && item.cpm2Broker === true && item.moderationStatus === 'approved' && item.brokerStatus === 'in_stock' && item.dealMode === mode;
        });
        if (!cards.length) {
            var marketTitle = localized(mode === 'sell' ? 'landing_sell_title' : 'landing_trade_title', mode === 'sell' ? 'Машины на продажу · SELL' : 'Машины для обмена · TRADE');
            var marketDescription = 'Блок ' + featureBlockNumbers[slot] + '. ' + localized('landing_listing_empty', 'Здесь появятся объявления CPM2.');
            emptySlot(section, marketTitle, marketDescription + (isAdminUser() ? ' Выбери одобренное объявление в настройках CPM2.' : ''), slot);
            return;
        }
        section.hidden = false;
        section.innerHTML = '<div class="cpm2-sidebar-market-heading"><span>' + (mode === 'sell' ? '↗ SELL' : '⇄ TRADE') + '</span><strong>' + escape(featureLabels[slot]) + '</strong></div>' + cards.map(function(item) {
            var image = safeUrl(item.imageUrl);
            var price = mode === 'trade' ? (item.tradeFor || 'Предложения обмена') : (Number(item.price || 0).toLocaleString('ru-RU') + ' CPM2');
            return '<button type="button" class="cpm2-sidebar-listing" data-cpm2-home-listing="' + escape(item.id) + '" data-cpm2-home-mode="' + mode + '">' + (image ? '<img src="' + escape(image) + '" alt="" loading="lazy">' : '<span class="cpm2-sidebar-listing-placeholder">🚘</span>') + '<span><strong>' + escape(item.title || 'Автомобиль CPM2') + '</strong><small>' + escape(item.city || '') + (item.country ? ', ' + escape(item.country) : '') + '</small><em>' + escape(price) + '</em></span></button>';
        }).join('');
        section.querySelectorAll('[data-cpm2-home-listing]').forEach(function(button) {
            button.addEventListener('click', function() { window.openCpm2HomepageListing(button.getAttribute('data-cpm2-home-listing'), button.getAttribute('data-cpm2-home-mode')); });
        });
    }

    function fillBannerForm(number) {
        var slot = config.banners && config.banners['banner' + number] || {};
        var byId = function(suffix) { return document.getElementById('cpm2Banner' + number + suffix); };
        if (byId('Title')) byId('Title').value = slot.title || '';
        if (byId('Text')) byId('Text').value = slot.text || '';
        if (byId('Link')) byId('Link').value = slot.link || '';
        if (byId('Images')) byId('Images').value = (slot.images || []).join('\n');
        if (byId('Files')) byId('Files').value = '';
    }

    function renderAdminEditor() {
        var editor = document.getElementById('cpm2HomeEditor');
        var picks = document.getElementById('cpm2HomePicks');
        if (!editor || !picks) return;
        editor.hidden = !isAdminUser();
        if (!isAdminUser()) return;
        fillBannerForm(1);
        fillBannerForm(2);
        picks.innerHTML = Object.keys(featureLabels).map(function(slot) {
            var mode = slot.indexOf('trade') === 0 ? 'trade' : 'sell';
            var options = activeListings(mode);
            var chosen = Array.isArray(config.featured && config.featured[slot]) ? config.featured[slot] : [];
            var selectHtml = [0, 1, 2].map(function(index) {
                var value = chosen[index] || '';
                return '<select data-cpm2-pick-slot="' + slot + '" data-cpm2-pick-index="' + index + '"><option value="">— не выбрано —</option>' + options.map(function(item) {
                    var text = item.title + (mode === 'sell' ? ' · ' + Number(item.price || 0).toLocaleString('ru-RU') + ' CPM2' : ' · Trade') + ' · ' + (item.city || '');
                    return '<option value="' + escape(item.id) + '"' + (item.id === value ? ' selected' : '') + '>' + escape(text) + '</option>';
                }).join('') + '</select>';
            }).join('');
            return '<fieldset class="cpm2-home-pick-group" data-cpm2-editor-target="' + slot + '"><legend>' + escape(featureLabels[slot]) + '</legend>' + selectHtml + (options.length ? '' : '<small>Нет одобренных объявлений этого типа. Одобри заявку в гараже — она появится здесь.</small>') + '</fieldset>';
        }).join('');
    }

    function bannerValue(number) {
        var value = function(suffix) { return document.getElementById('cpm2Banner' + number + suffix); };
        var images = (value('Images').value || '').split(/\r?\n/).map(function(line) { return line.trim(); }).filter(Boolean);
        var files = Array.from(value('Files').files || []);
        if (images.some(function(url) { return !safeUrl(url); })) throw new Error('Проверь ссылки на изображения в баннере ' + number + '. Нужны полные http:// или https:// ссылки.');
        if (images.length + files.length > 5) throw new Error('В одном баннере можно разместить до пяти слайдов.');
        files.forEach(function(file) {
            if (!file.type.match(/^image\//i) || file.size >= 5 * 1024 * 1024) throw new Error('Каждое изображение баннера должно быть меньше 5 МБ.');
        });
        var link = value('Link').value.trim();
        if (link && !safeUrl(link)) throw new Error('Ссылка баннера должна начинаться с http:// или https://.');
        return {
            title: value('Title').value.trim().slice(0, 70),
            text: value('Text').value.trim().slice(0, 160),
            link: link,
            images: images,
            files: files
        };
    }

    window.saveCpm2HomepageShowcase = function() {
        var status = document.getElementById('cpm2HomeEditorStatus');
        var button = document.getElementById('cpm2HomeSaveButton');
        if (!isAdminUser()) return;
        var first, second;
        try { first = bannerValue(1); second = bannerValue(2); }
        catch (error) { if (status) status.textContent = error.message; return; }
        var saveBanners = Promise.all([first, second].map(function(banner, index) {
            var slotName = 'banner' + (index + 1);
            return Promise.all(banner.files.map(function(file, fileIndex) {
                var filePath = storageRoot + '/' + USER_UID + '/' + slotName + '/' + Date.now() + '_' + fileIndex;
                return storage.ref(filePath).put(file, { contentType: file.type }).then(function(snapshot) { return snapshot.ref.getDownloadURL(); });
            })).then(function(uploaded) {
                return { title: banner.title, text: banner.text, link: banner.link, images: banner.images.concat(uploaded).slice(0, 5) };
            });
        }));
        var featured = {};
        document.querySelectorAll('[data-cpm2-pick-slot]').forEach(function(select) {
            var slot = select.getAttribute('data-cpm2-pick-slot');
            if (!featured[slot]) featured[slot] = [];
            featured[slot][Number(select.getAttribute('data-cpm2-pick-index'))] = select.value || '';
        });
        Object.keys(featured).forEach(function(slot) { featured[slot] = featured[slot].filter(Boolean).slice(0, 3); });
        if (button) button.disabled = true;
        if (status) status.textContent = 'Сохраняю баннеры и подборки…';
        saveBanners.then(function(banners) {
            var next = { banners: { banner1: banners[0], banner2: banners[1] }, featured: featured, updatedAt: Date.now(), updatedBy: USER_UID };
            return settingsRef().set(next).then(function() { return next; });
        }).then(function(next) {
            config = next;
            render();
            renderAdminEditor();
            if (status) status.textContent = 'Витрина сохранена и обновлена.';
        }).catch(function(error) {
            if (status) status.textContent = 'Не удалось сохранить: ' + (error.message || 'проверь Database Rules и Firebase Storage.');
        }).finally(function() { if (button) button.disabled = false; });
    };

    function render() {
        renderBanner('banner1', config.banners && config.banners.banner1 || {});
        renderBanner('banner2', config.banners && config.banners.banner2 || {});
        Object.keys(featureLabels).forEach(renderFeatureSlot);
        renderAdminEditor();
    }

    window.openCpm2HomepageListing = function(id, mode) {
        if (typeof window.goToCpm2Market === 'function') window.goToCpm2Market(mode === 'trade' ? 'trade' : 'sell');
        var attempts = 0;
        var timer = setInterval(function() {
            attempts += 1;
            if (typeof window.openMarketplaceDetail === 'function' && typeof marketplaceListings !== 'undefined' && marketplaceListings[id]) {
                clearInterval(timer);
                window.openMarketplaceDetail(id);
            } else if (attempts >= 30) clearInterval(timer);
        }, 200);
    };

    function load() {
        if (!USER_UID) {
            config = { banners: {}, featured: {} };
            listings = {};
            render();
            return;
        }
        Promise.all([settingsRef().once('value'), db.ref('sites/' + SITE + '/marketplace_listings').once('value')]).then(function(snapshots) {
            config = snapshots[0].val() || { banners: {}, featured: {} };
            listings = snapshots[1].val() || {};
            render();
        }).catch(function(error) { console.warn('Не удалось загрузить CPM2-витрину:', error); });
    }

    if (typeof auth !== 'undefined' && auth.onAuthStateChanged) auth.onAuthStateChanged(load);
    else document.addEventListener('DOMContentLoaded', load);
})();
