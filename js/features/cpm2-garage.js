// Комиссионный игровой гараж CPM2: приёмка машины администратором и ручная выдача в игре.
(function() {
    'use strict';
    var root = function(path) { return db.ref('sites/' + SITE + '/' + path); };
    var admins = function() { return typeof ADMIN_UIDS !== 'undefined' ? ADMIN_UIDS : []; };
    var isAdmin = function() { return !!USER_UID && admins().indexOf(USER_UID) !== -1; };
    var bankOwner = null;
    var garageCache = {};
    var profileUid = null;
    var money = function(value) { return Math.max(0, Number(value) || 0).toLocaleString('ru-RU'); };
    var esc = function(value) { var node = document.createElement('span'); node.textContent = String(value == null ? '' : value); return node.innerHTML; };

    function loadProfile(uid, userData) {
        profileUid = uid || (typeof VIEWING_USER !== 'undefined' && VIEWING_USER) || USER_UID;
        var panel = document.getElementById('cpm2GaragePanel');
        var submit = document.getElementById('cpm2GarageSubmit');
        var formBody = document.getElementById('cpm2GarageFormBody');
        var formToggle = document.getElementById('cpm2GarageFormToggle');
        var list = document.getElementById('cpm2GarageList');
        if (!panel || !profileUid) return;
        panel.hidden = false;
        if (submit) submit.hidden = profileUid !== USER_UID;
        if (formBody) formBody.hidden = true;
        if (formToggle) formToggle.setAttribute('aria-expanded', 'false');
        if (list) list.innerHTML = '<div class="cpm2-garage-empty">Загружаем гараж…</div>';
        if (profileUid === USER_UID && userData) {
            var country = document.getElementById('cpm2GarageCountry');
            var city = document.getElementById('cpm2GarageCity');
            if (country && !country.value) country.value = userData.country || '';
            if (city && !city.value) city.value = userData.city || '';
        }
        var submissionsRequest = profileUid === USER_UID
            ? root('cpm2_garage_submissions/' + profileUid).once('value')
            : Promise.resolve(null);
        Promise.all([
            root('cpm2_garage_inventory').once('value'),
            submissionsRequest,
            root('ambassador_bank').once('value'),
            root('marketplace_listings').orderByChild('sellerUid').equalTo(profileUid).once('value')
        ]).then(function(results) {
            bankOwner = results[2].val() && results[2].val().ownerUid || null;
            renderProfileGarage(results[0].val() || {}, results[1] ? results[1].val() || {} : {}, results[3].val() || {});
        }).catch(function(error) {
            if (list) list.innerHTML = '<div class="cpm2-garage-empty">Не удалось загрузить гараж: ' + esc(error.message || 'ошибка доступа') + '</div>';
        });
    }

    window.toggleCpm2GarageForm = function(forceOpen) {
        var body = document.getElementById('cpm2GarageFormBody');
        var toggle = document.getElementById('cpm2GarageFormToggle');
        if (!body || !toggle) return;
        var open = typeof forceOpen === 'boolean' ? forceOpen : body.hidden;
        body.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        toggle.textContent = open ? '− Свернуть форму' : '＋ Подать автомобиль на комиссию';
    };

    function renderProfileGarage(inventory, submissions, marketplaceListings) {
        var list = document.getElementById('cpm2GarageList');
        if (!list) return;
        garageCache = inventory;
        var cars = Object.keys(marketplaceListings || {}).map(function(id) { return Object.assign({ id: id }, marketplaceListings[id] || {}); })
            .filter(function(car) { return car.cpm2Broker === true && car.sellerUid === profileUid && (car.isActive === true || car.brokerStatus === 'sold'); })
            .sort(function(a, b) { return Number(b.createdAt || 0) - Number(a.createdAt || 0); });
        var ownSubmissions = Object.keys(submissions || {}).map(function(id) { return Object.assign({ id: id }, submissions[id] || {}); })
            .filter(function(item) { return item.status !== 'accepted' || !item.publishedAt; })
            .sort(function(a, b) { return Number(b.createdAt || 0) - Number(a.createdAt || 0); });
        var html = cars.map(function(car) {
            var image = /^https?:\/\//i.test(car.imageUrl || '') ? '<img src="' + esc(car.imageUrl) + '" alt="">' : '<span class="cpm2-garage-car-icon">🚘</span>';
            var deal = car.dealMode === 'trade' ? '⇄ ОБМЕН' : '↗ ПРОДАЖА';
            var purchase = car.brokerStatus === 'sold' ? '<span class="cpm2-garage-owner-tag">Сделка завершена</span>' : USER_UID && USER_UID !== car.sellerUid ? '<button type="button" data-garage-buy="' + esc(car.id) + '">' + (car.dealMode === 'trade' ? 'Предложить обмен' : 'Купить за ' + money(car.price) + ' CPM2') + '</button>' : '<span class="cpm2-garage-owner-tag">' + (USER_UID === car.sellerUid ? 'Твоя машина на комиссии' : 'В гараже') + '</span>';
            return '<article class="cpm2-garage-car">' + image + '<div><span>В ИГРОВОМ ГАРАЖЕ · ' + deal + '</span><h4>' + esc(car.title || 'Автомобиль') + '</h4><p>' + esc(car.description || '') + '</p>' + (car.dealMode === 'trade' ? '<strong>Ищет: ' + esc(car.tradeFor || 'предложения обмена') + '</strong>' : '<strong>💲 ' + money(car.price) + ' CPM2</strong>') + purchase + '</div></article>';
        }).join('');
        html += ownSubmissions.map(function(item) {
            var state = item.status === 'accepted' ? 'Принята · завершается публикация' : item.status === 'rejected' ? 'Отклонена модератором' : 'Подана · на модерации, ждёт фактической передачи машины';
            var gameIdEditor = item.status !== 'rejected' ? '<label class="cpm2-game-id-edit">Игровой ID CPM2<input type="text" maxlength="80" value="' + esc(item.gameId || '') + '" placeholder="Например, PX847653" data-garage-game-id="' + esc(item.id) + '"><button type="button" data-save-game-id="' + esc(item.id) + '">Сохранить ID</button></label>' : '<span>ID игрока CPM2: ' + esc(item.gameId || 'не указан') + '</span>';
            return '<article class="cpm2-garage-submission"><div><strong>' + esc(item.title) + '</strong><span>' + state + (item.reviewNote ? ' · ' + esc(item.reviewNote) : '') + '</span>' + gameIdEditor + '</div><b>Оценка: ' + money(item.creditAmount) + ' CPM2</b></article>';
        }).join('');
        list.innerHTML = html || '<div class="cpm2-garage-empty">В этом гараже пока нет принятых автомобилей.</div>';
        list.querySelectorAll('[data-garage-buy]').forEach(function(button) {
            button.addEventListener('click', function() { buyCar(button.getAttribute('data-garage-buy'), button); });
        });
        list.querySelectorAll('[data-save-game-id]').forEach(function(button) {
            button.addEventListener('click', function() { saveSubmissionGameId(button.getAttribute('data-save-game-id'), button); });
        });
    }

    function saveSubmissionGameId(submissionId, button) {
        var input = document.querySelector('[data-garage-game-id="' + CSS.escape(submissionId) + '"]');
        var gameId = (input && input.value || '').trim();
        if (!USER_UID || profileUid !== USER_UID || !gameId || gameId.length > 80) { alert('Введи игровой ID CPM2 (до 80 символов).'); return; }
        button.disabled = true;
        root('cpm2_garage_submissions/' + USER_UID + '/' + submissionId + '/gameId').set(gameId)
            .then(function() { button.textContent = 'Сохранено'; if (window.loadCpm2GarageAdmin && isAdmin()) window.loadCpm2GarageAdmin(); })
            .catch(function(error) { alert('Не удалось сохранить ID: ' + (error.message || 'проверь Database Rules')); })
            .finally(function() { button.disabled = false; });
    }

    window.submitCpm2GarageCar = function() {
        var title = (document.getElementById('cpm2GarageTitle').value || '').trim();
        var gameId = (document.getElementById('cpm2GarageGameId').value || '').trim();
        var price = Number(document.getElementById('cpm2GaragePrice').value);
        var imageUrl = (document.getElementById('cpm2GarageImage').value || '').trim();
        var imageFile = document.getElementById('cpm2GarageImageFile').files[0];
        var description = (document.getElementById('cpm2GarageDescription').value || '').trim();
        var dealMode = document.getElementById('cpm2GarageMode').value === 'trade' ? 'trade' : 'sell';
        var tradeFor = (document.getElementById('cpm2GarageTradeFor').value || '').trim();
        var countryText = (document.getElementById('cpm2GarageCountry').value || '').trim();
        var city = (document.getElementById('cpm2GarageCity').value || '').trim();
        var countryInfo = typeof datingCountryCode === 'function' ? datingCountryCode(countryText) : null;
        var feedback = document.getElementById('cpm2GarageFeedback');
        var button = document.getElementById('cpm2GarageSubmitButton');
        if (!USER_UID) { if (feedback) feedback.textContent = 'Войди в аккаунт, чтобы подать заявку.'; return; }
        if (gameId.length < 1 || gameId.length > 80) { if (feedback) feedback.textContent = 'Укажи свой игровой ID CPM2 — по нему администратор найдёт тебя в игре.'; return; }
        if (title.length < 2 || !description || !Number.isSafeInteger(price) || price < 1 || price > 1000000000000) { if (feedback) feedback.textContent = 'Укажи модель, описание машины и целую цену в CPM2.'; return; }
        if (!countryInfo || !city) { if (feedback) feedback.textContent = 'Укажи страну и город: они появятся в Sell/Trade.'; return; }
        if (imageUrl && !/^https?:\/\//i.test(imageUrl)) { if (feedback) feedback.textContent = 'Ссылка на фото должна начинаться с https:// или http://.'; return; }
        if (imageFile && (!imageFile.type.match(/^image\//i) || imageFile.size >= 5 * 1024 * 1024)) { if (feedback) feedback.textContent = 'Выбери изображение размером меньше 5 МБ.'; return; }
        if (dealMode === 'trade' && !tradeFor) { if (feedback) feedback.textContent = 'Для обмена напиши, что ищешь.'; return; }
        button.disabled = true;
        var ref = root('cpm2_garage_submissions/' + USER_UID).push();
        var imagePromise = imageFile
            ? storage.ref('cpm2-garage-photos/' + USER_UID + '/' + ref.key + '/main').put(imageFile, { contentType: imageFile.type }).then(function(snapshot) { return snapshot.ref.getDownloadURL(); })
            : Promise.resolve(imageUrl);
        imagePromise.then(function(savedImageUrl) {
            return ref.set({ sellerUid: USER_UID, sellerName: typeof USER !== 'undefined' ? USER : '', gameId: gameId, title: title, description: description, imageUrl: savedImageUrl, price: price, creditAmount: price, dealMode: dealMode, tradeFor: tradeFor, country: countryInfo.name, countryCode: countryInfo.code, city: city, status: 'pending', createdAt: Date.now() });
        })
            .then(function() {
                document.getElementById('cpm2GarageTitle').value = '';
                document.getElementById('cpm2GarageGameId').value = '';
                document.getElementById('cpm2GaragePrice').value = '';
                document.getElementById('cpm2GarageImage').value = '';
                document.getElementById('cpm2GarageImageFile').value = '';
                document.getElementById('cpm2GarageDescription').value = '';
                if (feedback) feedback.innerHTML = 'Заявка отправлена на модерацию. Напиши админу в <a href="https://t.me/METAIMPERIYA" target="_blank" rel="noopener noreferrer">Telegram</a>, чтобы согласовать передачу машины в игре.';
                loadProfile(USER_UID);
            }).catch(function(error) { if (feedback) feedback.textContent = error.code === 'storage/unauthorized' || error.code === 'storage/bucket-not-found' ? 'Не удалось загрузить фото в текущий Firebase Storage. Укажи прямую ссылку или проверь Storage Rules.' : 'Не удалось отправить заявку: ' + (error.message || 'проверь Database Rules'); })
            .finally(function() { button.disabled = false; });
    };

    window.goToCpm2GarageSubmit = function(mode) {
        if (!window.checkAccess()) return;
        window.goToProfile();
        window.setTimeout(function() {
            var panel = document.getElementById('cpm2GaragePanel');
            var form = document.getElementById('cpm2GarageSubmit');
            var select = document.getElementById('cpm2GarageMode');
            if (form) form.hidden = false;
            window.toggleCpm2GarageForm(true);
            if (select) select.value = mode === 'trade' ? 'trade' : 'sell';
            if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
    };

    function buyCar(id, button) {
        var car = garageCache[id];
        var player = typeof window.getAmbassadorPlayer === 'function' && window.getAmbassadorPlayer(USER_UID);
        var amount = Number(car && car.price);
        if (!USER_UID) { alert('Войди, чтобы купить машину.'); return; }
        if (!car || car.isAvailable === false || USER_UID === car.sellerUid) return;
        var isTrade = car.dealMode === 'trade';
        if (!isTrade && (!player || Number(player.cpm2Balance || 0) < amount)) { alert('На балансе недостаточно CPM2. Получить баланс можно после согласованной передачи автомобиля администратору.'); return; }
        if (!isTrade && !bankOwner) { alert('Общий CPM2-банк пока не настроен.'); return; }
        var offerText = isTrade ? prompt('Напиши, какой автомобиль предлагаешь в обмен. Передача обеих машин подтверждается в игре администратором.', '') : '';
        if (isTrade && (!offerText || offerText.trim().length < 2)) return;
        if (!confirm(isTrade ? 'Отправить предложение обмена по машине ' + car.title + '? Администратор свяжется с тобой для передачи машин в игре.' : 'Списать ' + money(amount) + ' CPM2 за ' + car.title + '? После оплаты администратор вручную передаст машину в игре.')) return;
        button.disabled = true;
        var orderRef = root('cpm2_garage_orders').push();
        var reservationRef = root('cpm2_garage_reservations/' + id);
        orderRef.set({ buyerUid: USER_UID, sellerUid: car.sellerUid, listingId: id, title: car.title, amount: isTrade ? 0 : amount, orderType: isTrade ? 'trade' : 'purchase', offerText: isTrade ? offerText.trim().slice(0, 500) : '', status: isTrade ? 'trade_offer' : 'awaiting_payment', createdAt: Date.now() })
            .then(function() {
                return reservationRef.transaction(function(current) { if (current) return; return { buyerUid: USER_UID, orderId: orderRef.key, at: Date.now() }; }).then(function(result) {
                    if (!result.committed) throw new Error('Машина уже зарезервирована другим покупателем.');
                    if (isTrade) return 'trade_offer';
                    return window.transferCpm2(bankOwner, amount);
                });
            }).then(function(transferId) {
                if (transferId === 'trade_offer') return 'trade_offer';
                if (!transferId) throw new Error('Перевод CPM2 не прошёл. Проверь баланс и попробуй ещё раз.');
                return orderRef.update({ status: 'paid_waiting_delivery', paymentTransferId: transferId, paidAt: Date.now() }).then(function() { return 'paid'; });
            }).then(function(result) {
                alert(result === 'trade_offer' ? 'Предложение обмена отправлено на согласование.' : 'CPM2 списаны. Заявка отправлена администратору для передачи машины в игре.');
                if (window.loadCpm2GarageAdmin) window.loadCpm2GarageAdmin();
            }).catch(function(error) {
                if (error && error.message && /зарезервирована/.test(error.message)) orderRef.remove();
                if (error && error.message && /перевод CPM2 не прошёл/.test(error.message)) { reservationRef.remove(); orderRef.remove(); }
                alert(error.message || 'Не удалось оформить покупку. Если CPM2 уже списались, свяжись с администратором и укажи время операции.');
            }).finally(function() { button.disabled = false; });
    }

    function adminQueue() {
        var adminPanel = document.getElementById('cpm2GarageAdmin');
        if (!adminPanel) return;
        adminPanel.hidden = !isAdmin();
        if (!isAdmin()) return;
        Promise.all([root('cpm2_garage_submissions').once('value'), root('cpm2_garage_orders').once('value')]).then(function(snapshots) {
            renderAdminQueue(snapshots[0].val() || {}, snapshots[1].val() || {});
        }).catch(function(error) {
            var queue = document.getElementById('cpm2GarageQueue');
            if (queue) {
                var denied = error && (error.code === 'PERMISSION_DENIED' || /permission_denied|permission denied/i.test(error.message || ''));
                queue.innerHTML = '<div class="cpm2-garage-empty">' + (denied
                    ? 'Firebase не разрешил читать очередь. Опубликуй актуальный database.rules.json в Realtime Database проекта myecosystem-e6414 и проверь, что текущий аккаунт указан в ADMIN_UIDS.'
                    : 'Не удалось загрузить заявки: ' + esc(error && error.message || 'ошибка доступа')) + '</div>';
            }
        });
    }

    function renderAdminQueue(submissions, orders) {
        var queue = document.getElementById('cpm2GarageQueue');
        var orderList = document.getElementById('cpm2GarageOrders');
        var applications = [];
        Object.keys(submissions).forEach(function(uid) { Object.keys(submissions[uid] || {}).forEach(function(id) {
            var item = submissions[uid][id]; if (item) applications.push(Object.assign({ id: id, sellerUid: uid }, item));
        }); });
        applications.sort(function(a, b) { return Number(b.createdAt || 0) - Number(a.createdAt || 0); });
        if (queue) queue.innerHTML = applications.length ? applications.map(function(item) {
            var image = /^https?:\/\//i.test(item.imageUrl || '') ? '<img src="' + esc(item.imageUrl) + '" alt="">' : '<span>🚘</span>';
            var resumed = item.status === 'accepted' && !item.publishedAt;
            var status = item.status === 'rejected' ? 'Отклонена' : item.status === 'accepted' ? item.publishedAt ? 'Принята и опубликована' : 'Принята · требуется завершить публикацию' : 'Ожидает модерации';
            var actions = item.status === 'pending'
                ? '<label>Начислить при приёмке <input type="number" min="1" max="1000000000000" step="1" value="' + Number(item.creditAmount || item.price || 0) + '" data-garage-credit="' + esc(uidKey(item.sellerUid, item.id)) + '"> CPM2</label><div><button type="button" data-garage-accept="' + esc(uidKey(item.sellerUid, item.id)) + '">Машину получил · начислить</button><button type="button" class="secondary" data-garage-reject="' + esc(uidKey(item.sellerUid, item.id)) + '">Отклонить</button></div>'
                : resumed ? '<p>Машина принята и баланс начислен. Можно завершить публикацию в Sell и ленте.</p><input type="hidden" value="' + Number(item.creditAmount || item.price || 0) + '" data-garage-credit="' + esc(uidKey(item.sellerUid, item.id)) + '"><div><button type="button" data-garage-accept="' + esc(uidKey(item.sellerUid, item.id)) + '">Завершить публикацию</button></div>'
                : '<p class="cpm2-garage-admin-status">Статус: ' + status + (item.reviewNote ? ' · ' + esc(item.reviewNote) : '') + '</p>';
            return '<article class="cpm2-garage-admin-row">' + image + '<div><strong>' + esc(item.title) + (item.dealMode === 'trade' ? ' · TRADE' : ' · SELL') + '</strong><p>' + esc(item.sellerName) + ' · UID сайта: ' + esc(item.sellerUid) + '</p><p class="cpm2-game-player-id"><strong>ID игрока CPM2: ' + esc(item.gameId || 'не указан в этой заявке') + '</strong></p><p>' + esc(item.city || '') + ', ' + esc(item.country || '') + ' · ' + esc(item.description || 'Без описания') + '</p>' + actions + '</div></article>';
        }).join('') : '<div class="cpm2-garage-empty">Новых заявок на приёмку нет.</div>';
        if (orderList) {
            var activeOrders = Object.keys(orders).map(function(id) { return Object.assign({ id: id }, orders[id] || {}); }).filter(function(order) { return order.status === 'paid_waiting_delivery' || order.status === 'trade_offer' || order.status === 'trade_waiting_delivery'; });
            orderList.innerHTML = activeOrders.length ? activeOrders.map(function(order) {
                var trade = order.status.indexOf('trade_') === 0;
                var details = trade ? 'Предлагает: ' + esc(order.offerText || '—') + ' · UID: ' + esc(order.buyerUid) : 'Покупатель: ' + esc(order.buyerUid) + ' · ' + money(order.amount) + ' CPM2 оплачено';
                var action = order.status === 'trade_offer' ? '<button type="button" data-garage-trade="' + esc(order.id) + '">Обмен согласован · машину получил</button><button type="button" class="secondary" data-garage-trade-reject="' + esc(order.id) + '">Отклонить</button>' : '<button type="button" data-garage-delivered="' + esc(order.id) + '">Машину передал покупателю</button>';
                return '<article class="cpm2-garage-order"><div><strong>' + (trade ? '⇄ ' : '🚘 ') + esc(order.title) + '</strong><span>' + details + '</span></div><div>' + action + '</div></article>';
            }).join('') : '<div class="cpm2-garage-empty">Активных заявок на продажу или обмен нет.</div>';
        }
        if (queue) {
            queue.querySelectorAll('[data-garage-accept]').forEach(function(button) { button.onclick = function() { acceptSubmission(button.getAttribute('data-garage-accept')); }; });
            queue.querySelectorAll('[data-garage-reject]').forEach(function(button) { button.onclick = function() { rejectSubmission(button.getAttribute('data-garage-reject')); }; });
        }
        if (orderList) orderList.querySelectorAll('[data-garage-delivered]').forEach(function(button) { button.onclick = function() { completeOrder(button.getAttribute('data-garage-delivered')); }; });
        if (orderList) orderList.querySelectorAll('[data-garage-trade]').forEach(function(button) { button.onclick = function() { acceptTrade(button.getAttribute('data-garage-trade')); }; });
        if (orderList) orderList.querySelectorAll('[data-garage-trade-reject]').forEach(function(button) { button.onclick = function() { rejectTrade(button.getAttribute('data-garage-trade-reject')); }; });
    }

    function uidKey(uid, id) { return encodeURIComponent(uid) + '|' + encodeURIComponent(id); }
    function parseKey(value) { var pair = String(value || '').split('|'); return { uid: decodeURIComponent(pair[0] || ''), id: decodeURIComponent(pair[1] || '') }; }
    function acceptSubmission(key) {
        var pair = parseKey(key);
        var input = document.querySelector('[data-garage-credit="' + CSS.escape(key) + '"]');
        var amount = Number(input && input.value);
        if (!Number.isSafeInteger(amount) || amount < 1) { alert('Укажи положительное целое начисление CPM2.'); return; }
        if (!confirm('Подтверждаешь, что машина уже физически получена в твоём игровом гараже?' + (amount ? ' Начислить продавцу ' + money(amount) + ' CPM2 из резерва?' : ''))) return;
        root('cpm2_garage_submissions/' + pair.uid + '/' + pair.id).once('value').then(function(snapshot) {
            var item = snapshot.val();
            if (!item || (item.status !== 'pending' && item.status !== 'accepted')) throw new Error('Заявка уже обработана. Обнови список.');
            var deterministicGrantId = 'garage_' + pair.uid + '_' + pair.id;
            var approvePromise = item.status === 'pending'
                ? window.grantAmbassadorPoints(pair.uid, amount, 'cpm2', deterministicGrantId).then(function(ok) {
                    if (!ok) throw new Error('Не удалось начислить CPM2. Проверь остаток резерва.');
                    return snapshot.ref.update({ status: 'accepted', creditAmount: amount, reviewedAt: Date.now(), reviewedBy: USER_UID, marketplaceListingId: 'cpm2_' + pair.uid + '_' + pair.id });
                })
                : Promise.resolve();
            return approvePromise.then(function() {
                var now = Date.now();
                var listingId = item.marketplaceListingId || ('cpm2_' + pair.uid + '_' + pair.id);
                var effectiveCredit = item.status === 'pending' ? amount : Number(item.creditAmount || amount);
                var listing = { kind: 'goods', category: 'Авто и запчасти', title: item.title, description: item.description || '', price: String(item.price), currency: 'CPM2', country: item.country, countryCode: item.countryCode, city: item.city, imageUrl: item.imageUrl || '', sellerUid: pair.uid, authorUid: pair.uid, submissionId: pair.id, createdAt: item.createdAt, isActive: true, cpm2Broker: true, moderationStatus: 'approved', brokerStatus: 'in_stock', brokerCreditAmount: effectiveCredit, dealMode: item.dealMode === 'trade' ? 'trade' : 'sell', tradeFor: item.tradeFor || '' };
                var inventoryRef = root('cpm2_garage_inventory').child(listingId);
                var listingRef = root('marketplace_listings/' + listingId);
                var feedRef = root('feed_posts/' + listingId);
                var feedPost = { authorUid: pair.uid, author: item.sellerName || 'Игрок CPM2', text: (item.dealMode === 'trade' ? 'Выставлена машина на Trade: ' : 'Выставлена машина на Sell: ') + item.title, timestamp: now, sharedEntity: { kind: 'marketplace_listing', id: listingId, title: item.title, description: (item.dealMode === 'trade' ? 'TRADE · Ищет: ' + (item.tradeFor || 'предложения') : 'SELL · ' + money(item.price) + ' CPM2') + ' · ' + item.city + ', ' + item.country, image: item.imageUrl || '' } };
                return snapshot.ref.update({ marketplaceListingId: listingId }).then(function() {
                    return inventoryRef.set({ title: item.title, description: item.description || '', imageUrl: item.imageUrl || '', sellerUid: pair.uid, sellerName: item.sellerName || '', price: Number(item.price), creditAmount: effectiveCredit, dealMode: item.dealMode === 'trade' ? 'trade' : 'sell', tradeFor: item.tradeFor || '', isAvailable: true, createdAt: item.createdAt, acceptedAt: now, acceptedBy: USER_UID });
                }).then(function() { return listingRef.set(listing); })
                    .then(function() { return feedRef.set(feedPost); })
                    .then(function() {
                        return snapshot.ref.update({ status: 'accepted', creditAmount: effectiveCredit, publishedAt: Date.now(), marketplaceListingId: listingId, reviewedAt: now, reviewedBy: USER_UID });
                    }).then(function() {
                        if (typeof loadFeed === 'function') loadFeed();
                        if (typeof window.loadCpm2MarketShowcase === 'function') window.loadCpm2MarketShowcase();
                        if (profileUid === pair.uid) loadProfile(pair.uid);
                    });
            });
        }).then(adminQueue).catch(function(error) { alert(error.message || 'Не удалось принять автомобиль.'); });
    }
    function rejectSubmission(key) {
        var pair = parseKey(key);
        var reason = prompt('Причина отказа (необязательно):', '');
        if (reason === null) return;
        root('cpm2_garage_submissions/' + pair.uid + '/' + pair.id).update({ status: 'rejected', reviewNote: reason.slice(0, 300), reviewedAt: Date.now(), reviewedBy: USER_UID }).then(adminQueue).catch(function(error) { alert('Не удалось обновить заявку: ' + (error.message || 'ошибка')); });
    }
    function completeOrder(id) {
        if (!confirm('Подтверждаешь, что передал автомобиль покупателю в игре?')) return;
        var ref = root('cpm2_garage_orders/' + id);
        ref.once('value').then(function(snapshot) {
            var order = snapshot.val();
            if (!order || (order.status !== 'paid_waiting_delivery' && order.status !== 'trade_waiting_delivery')) throw new Error('Заявка ещё не подтверждена администратором или уже обработана.');
            return Promise.all([
                ref.update({ status: 'delivered', deliveredAt: Date.now(), deliveredBy: USER_UID }),
                root('cpm2_garage_inventory/' + order.listingId).update({ isAvailable: false, soldAt: Date.now(), orderId: id }),
                root('marketplace_listings/' + order.listingId).update({ isActive: false, brokerStatus: 'sold', soldAt: Date.now(), orderId: id }),
                root('cpm2_garage_reservations/' + order.listingId).remove()
            ]);
        }).then(adminQueue).catch(function(error) { alert(error.message || 'Не удалось завершить заявку.'); });
    }
    function acceptTrade(id) {
        if (!confirm('Подтверждаешь, что получил предложенную машину в игре и согласовал обмен?')) return;
        root('cpm2_garage_orders/' + id).update({ status: 'trade_waiting_delivery', tradeAcceptedAt: Date.now(), tradeAcceptedBy: USER_UID }).then(adminQueue).catch(function(error) { alert('Не удалось подтвердить обмен: ' + (error.message || 'ошибка')); });
    }
    function rejectTrade(id) {
        if (!confirm('Отклонить предложение обмена и освободить автомобиль?')) return;
        var ref = root('cpm2_garage_orders/' + id);
        ref.once('value').then(function(snapshot) {
            var order = snapshot.val();
            if (!order || order.status !== 'trade_offer') throw new Error('Предложение уже обработано.');
            return Promise.all([ref.update({ status: 'rejected', rejectedAt: Date.now(), rejectedBy: USER_UID }), root('cpm2_garage_reservations/' + order.listingId).remove()]);
        }).then(adminQueue).catch(function(error) { alert(error.message || 'Не удалось отклонить обмен.'); });
    }

    window.openCpm2GarageListing = function(id) {
        if (!USER_UID) return;
        root('marketplace_listings/' + id).once('value').then(function(snapshot) {
            var item = snapshot.val();
            if (!item || item.cpm2Broker !== true || item.isActive !== true) { alert('Это объявление уже недоступно.'); return; }
            if (typeof window.goToCpm2Market === 'function') window.goToCpm2Market(item.dealMode === 'trade' ? 'trade' : 'sell');
            marketplaceListings[id] = item;
            if (typeof window.openMarketplaceDetail === 'function') window.openMarketplaceDetail(id);
            else if (typeof openMarketplaceDetail === 'function') openMarketplaceDetail(id);
        }).catch(function() { alert('Не удалось открыть объявление.'); });
    };

    window.loadCpm2GarageProfile = loadProfile;
    window.loadCpm2GarageAdmin = adminQueue;
    document.addEventListener('DOMContentLoaded', function() { adminQueue(); });
    if (typeof auth !== 'undefined' && auth && auth.onAuthStateChanged) auth.onAuthStateChanged(function() { adminQueue(); });
})();
