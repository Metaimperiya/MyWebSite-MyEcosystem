// ================================================================
// РАБОТА: КОМПАНИИ, ВАКАНСИИ И РЕЗЮМЕ
// ================================================================
var workCompanies = {};
var workResumes = {};
var workResumeContacts = {};
var workVacancies = {};
var workActiveTab = 'vacancies';
var workActiveCompany = null;
var workEditingCompany = null;

function workEscape(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(char) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
}

function workUrl(value) {
    if (!value) return '';
    try {
        var url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (error) { return ''; }
}

function workDate(value) {
    return value ? new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

window.loadWork = function() {
    var list = document.getElementById('workList');
    if (!list) return;
    if (!USER_UID) { list.innerHTML = '<div class="work-empty">Войди, чтобы открыть раздел «Работа».</div>'; return; }
    list.innerHTML = '<div class="work-empty">Загружаем вакансии, компании и резюме…</div>';
    var root = 'sites/' + SITE + '/';
    Promise.all([
        db.ref(root + 'work_companies').once('value'),
        db.ref(root + 'work_resumes').once('value')
    ]).then(function(snapshots) {
        workCompanies = snapshots[0].val() || {};
        workResumes = snapshots[1].val() || {};
        var ownResume = workResumes[USER_UID];
        var contactsPromise = ownResume
            ? db.ref(root + 'work_resume_contacts/' + USER_UID).once('value').then(function(snapshot) { workResumeContacts = snapshot.val() || {}; })
            : Promise.resolve();
        var companyIds = Object.keys(workCompanies);
        return Promise.all([contactsPromise].concat(companyIds.map(function(id) {
            return db.ref(root + 'work_vacancies/' + id).once('value').then(function(snapshot) {
                workVacancies[id] = snapshot.val() || {};
            });
        })));
    }).then(renderWork).catch(function(error) {
        console.error('Не удалось загрузить раздел работы:', error);
        list.innerHTML = '<div class="work-empty">Не удалось загрузить раздел. Проверь подключение и правила Firebase.</div>';
    });
};

window.showWorkTab = function(tab) {
    if (['vacancies', 'companies', 'resumes'].indexOf(tab) === -1) return;
    workActiveTab = tab;
    workActiveCompany = null;
    document.querySelectorAll('[data-work-tab]').forEach(function(button) {
        button.classList.toggle('active', button.getAttribute('data-work-tab') === tab);
    });
    var detail = document.getElementById('workCompanyDetail');
    if (detail) detail.hidden = true;
    var search = document.getElementById('workSearch');
    if (search) search.placeholder = tab === 'vacancies' ? 'Поиск вакансий' : tab === 'companies' ? 'Поиск компаний' : 'Поиск резюме';
    var createButton = document.getElementById('workCreateButton');
    if (createButton) createButton.textContent = tab === 'vacancies' ? '＋ Вакансия' : tab === 'companies' ? '＋ Компания' : (workResumes[USER_UID] ? 'Моё резюме' : '＋ Резюме');
    renderWork();
};

function renderWork() {
    var list = document.getElementById('workList');
    var detail = document.getElementById('workCompanyDetail');
    if (!list) return;
    if (detail) detail.hidden = true;
    list.hidden = false;
    var query = ((document.getElementById('workSearch') || {}).value || '').trim().toLocaleLowerCase('ru');
    var cards = [];
    if (workActiveTab === 'companies') {
        cards = Object.keys(workCompanies).map(function(id) { return Object.assign({ id: id }, workCompanies[id]); })
            .filter(function(company) { return !query || (company.name + ' ' + company.description).toLocaleLowerCase('ru').indexOf(query) !== -1; })
            .sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        list.className = 'work-list work-company-grid';
        list.innerHTML = cards.length ? cards.map(renderCompanyCard).join('') : workEmpty(query ? 'Компаний по этому запросу не найдено.' : 'Компаний пока нет. Создай страницу компании и добавь первую вакансию.', 'Создать компанию', 'openWorkCompanyModal()');
    } else if (workActiveTab === 'resumes') {
        cards = Object.keys(workResumes).map(function(uid) { return Object.assign({ uid: uid }, workResumes[uid]); })
            .filter(function(resume) { return !query || (resume.name + ' ' + resume.title + ' ' + resume.city + ' ' + resume.about).toLocaleLowerCase('ru').indexOf(query) !== -1; })
            .sort(function(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
        list.className = 'work-list work-resume-grid';
        list.innerHTML = cards.length ? cards.map(renderResumeCard).join('') : workEmpty(query ? 'Резюме по этому запросу не найдено.' : 'Пока нет резюме. Добавь своё, чтобы тебя могли найти работодатели.', 'Создать резюме', 'openWorkResumeModal()');
    } else {
        Object.keys(workVacancies).forEach(function(companyId) {
            var company = workCompanies[companyId] || {};
            Object.keys(workVacancies[companyId] || {}).forEach(function(id) {
                cards.push(Object.assign({ id: id, companyId: companyId, company: company }, workVacancies[companyId][id]));
            });
        });
        cards = cards.filter(function(item) { return !query || (item.title + ' ' + item.city + ' ' + item.salary + ' ' + item.description + ' ' + (item.company.name || '')).toLocaleLowerCase('ru').indexOf(query) !== -1; })
            .sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        list.className = 'work-list work-vacancy-list';
        list.innerHTML = cards.length ? cards.map(renderVacancyCard).join('') : workEmpty(query ? 'Вакансий по этому запросу не найдено.' : 'Вакансий пока нет. Создай компанию, чтобы опубликовать первую.', 'Создать компанию', 'openWorkCompanyModal()');
    }
    var count = document.getElementById('workCount');
    if (count) count.textContent = cards.length + (cards.length === 1 ? ' результат' : ' результатов');
    bindWorkCards();
}

function workEmpty(message, button, action) {
    return '<div class="work-empty"><span>💼</span><p>' + workEscape(message) + '</p>' + (button ? '<button type="button" class="work-primary" onclick="' + action + '">＋ ' + workEscape(button) + '</button>' : '') + '</div>';
}

function renderCompanyCard(company) {
    var logo = workUrl(company.avatarUrl);
    var cover = workUrl(company.coverUrl);
    var jobs = Object.keys(workVacancies[company.id] || {}).length;
    return '<article class="work-company-card"><button type="button" class="work-company-cover" data-work-company="' + workEscape(company.id) + '"' + (cover ? ' style="background-image:linear-gradient(0deg,#0005,transparent),url(&quot;' + workEscape(cover) + '&quot;)"' : '') + ' aria-label="Открыть ' + workEscape(company.name) + '"></button><button type="button" class="work-company-card-main" data-work-company="' + workEscape(company.id) + '"><span class="work-company-logo">' + (logo ? '<img src="' + workEscape(logo) + '" alt="">' : workEscape(Array.from(company.name || 'К')[0])) + '</span><span class="work-company-copy"><strong>' + workEscape(company.name) + '</strong><span>' + workEscape(company.description || 'Страница компании') + '</span></span></button><div class="work-card-foot"><span>' + jobs + ' вакансий</span>' + (company.ownerUid === USER_UID ? '<button type="button" data-edit-company="' + workEscape(company.id) + '">Настроить</button>' : '') + '</div></article>';
}

function renderVacancyCard(item) {
    var logo = workUrl(item.company.avatarUrl);
    var share = encodeURIComponent(JSON.stringify({ id: item.id, parentId: item.companyId, title: item.title, description: (item.company.name || 'Компания') + ' · ' + (item.city || 'Город не указан') + (item.salary ? ' · ' + item.salary : '') + ' — ' + item.description, image: logo }));
    return '<article class="work-shareable-card"><button type="button" class="work-vacancy-card" data-work-vacancy="' + workEscape(item.companyId) + '/' + workEscape(item.id) + '"><span class="work-vacancy-logo">' + (logo ? '<img src="' + workEscape(logo) + '" alt="">' : workEscape(Array.from(item.company.name || 'К')[0])) + '</span><span class="work-vacancy-body"><strong>' + workEscape(item.title) + '</strong><span class="work-vacancy-company">' + workEscape(item.company.name || 'Компания') + '</span><span class="work-vacancy-meta">' + workEscape(item.city || 'Город не указан') + (item.salary ? ' · ' + workEscape(item.salary) : '') + '</span><span class="work-vacancy-snippet">' + workEscape(item.description) + '</span></span><span class="work-vacancy-date">' + workEscape(workDate(item.createdAt)) + '</span></button><button type="button" class="work-share-button" data-share-kind="vacancy" data-feed-share="' + share + '">↗ Поделиться</button></article>';
}

function renderResumeCard(resume) {
    var photo = workUrl(resume.photoUrl);
    var share = encodeURIComponent(JSON.stringify({ id: resume.uid, title: resume.name + ' — ' + resume.title, description: [resume.city, resume.experience, resume.about].filter(Boolean).join(' · ').slice(0, 500), image: photo }));
    return '<article class="work-shareable-card"><button type="button" class="work-resume-card" data-work-resume="' + workEscape(resume.uid) + '"><span class="work-resume-photo">' + (photo ? '<img src="' + workEscape(photo) + '" alt="">' : '<span>' + workEscape(Array.from(resume.name || '?')[0]) + '</span>') + '</span><strong>' + workEscape(resume.name) + '</strong><span class="work-resume-title">' + workEscape(resume.title) + '</span><span class="work-resume-meta">' + workEscape(resume.city || 'Город не указан') + '</span><span class="work-resume-meta">' + workEscape(resume.experience || 'Опыт не указан') + '</span></button><button type="button" class="work-share-button" data-share-kind="resume" data-feed-share="' + share + '">↗ Поделиться</button></article>';
}

function bindWorkCards() {
    document.querySelectorAll('[data-work-company]').forEach(function(button) { button.onclick = function() { openWorkCompany(button.getAttribute('data-work-company')); }; });
    document.querySelectorAll('[data-edit-company]').forEach(function(button) { button.onclick = function(event) { event.stopPropagation(); openWorkCompanyModal(button.getAttribute('data-edit-company')); }; });
    document.querySelectorAll('[data-work-vacancy]').forEach(function(button) { button.onclick = function() { showWorkVacancy(button.getAttribute('data-work-vacancy')); }; });
    document.querySelectorAll('[data-work-resume]').forEach(function(button) { button.onclick = function() { showWorkResume(button.getAttribute('data-work-resume')); }; });
}

window.openWorkCompany = function(id) {
    var company = workCompanies[id];
    var detail = document.getElementById('workCompanyDetail');
    var list = document.getElementById('workList');
    if (!company || !detail || !list) return;
    workActiveCompany = id;
    var logo = workUrl(company.avatarUrl);
    var cover = workUrl(company.coverUrl);
    var vacancyItems = Object.keys(workVacancies[id] || {}).map(function(vacancyId) { return Object.assign({ id: vacancyId, companyId: id, company: company }, workVacancies[id][vacancyId]); }).sort(function(a,b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    detail.innerHTML = '<button type="button" class="group-back-button" onclick="closeWorkCompany()">← К вакансиям</button><header class="work-company-profile">' + (cover ? '<div class="work-company-profile-cover" style="background-image:linear-gradient(0deg,#0004,transparent),url(&quot;' + workEscape(cover) + '&quot;)"></div>' : '<div class="work-company-profile-cover"></div>') + '<div class="work-company-profile-info"><span class="work-company-profile-logo">' + (logo ? '<img src="' + workEscape(logo) + '" alt="">' : workEscape(Array.from(company.name || 'К')[0])) + '</span><div><h2>' + workEscape(company.name) + '</h2><p>' + workEscape(company.description || 'О компании пока нет описания.') + '</p></div>' + (company.ownerUid === USER_UID ? '<div class="work-company-actions"><button type="button" onclick="openWorkCompanyModal(\'' + workEscape(id) + '\')">Настроить</button><button type="button" class="work-primary" onclick="openWorkVacancyModal(\'' + workEscape(id) + '\')">＋ Вакансия</button></div>' : '') + '</div></header><h3 class="work-section-title">Вакансии компании</h3><div class="work-vacancy-list">' + (vacancyItems.length ? vacancyItems.map(renderVacancyCard).join('') : '<div class="work-empty">У компании пока нет открытых вакансий.</div>') + '</div>';
    list.hidden = true;
    detail.hidden = false;
    detail.querySelectorAll('[data-work-vacancy]').forEach(function(button) { button.onclick = function() { showWorkVacancy(button.getAttribute('data-work-vacancy')); }; });
    detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.closeWorkCompany = function() {
    workActiveCompany = null;
    var detail = document.getElementById('workCompanyDetail');
    if (detail) detail.hidden = true;
    var list = document.getElementById('workList');
    if (list) list.hidden = false;
};

function openWorkInfo(html) {
    document.getElementById('workInfoContent').innerHTML = html;
    document.getElementById('workInfoModal').classList.add('open');
}

function showWorkVacancy(key) {
    var parts = key.split('/');
    var vacancy = workVacancies[parts[0]] && workVacancies[parts[0]][parts[1]];
    var company = workCompanies[parts[0]] || {};
    if (!vacancy) return;
    openWorkInfo('<span class="work-detail-kicker">' + workEscape(company.name || 'Компания') + '</span><h2>' + workEscape(vacancy.title) + '</h2><p class="work-detail-meta">' + workEscape(vacancy.city || 'Город не указан') + (vacancy.salary ? ' · ' + workEscape(vacancy.salary) : '') + ' · ' + workEscape(workDate(vacancy.createdAt)) + '</p><div class="work-detail-description">' + workEscape(vacancy.description).replace(/\n/g, '<br>') + '</div><button type="button" class="work-primary" data-work-contact="' + workEscape(vacancy.ownerUid) + '">Связаться с работодателем</button>');
    var button = document.querySelector('[data-work-contact]');
    if (button) button.onclick = function() { closeWorkModal('workInfoModal'); if (typeof viewUserProfile === 'function') viewUserProfile(button.getAttribute('data-work-contact')); };
}

function showWorkResume(uid) {
    var resume = workResumes[uid];
    if (!resume) return;
    if (resume.contactsPublic) {
        db.ref('sites/' + SITE + '/work_resume_contacts/' + uid).once('value').then(function(snapshot) {
            renderWorkResumeDetail(uid, resume, snapshot.val() || {});
        }).catch(function() { renderWorkResumeDetail(uid, resume, {}); });
    } else renderWorkResumeDetail(uid, resume, {});
}

function renderWorkResumeDetail(uid, resume, contactsData) {
    var photo = workUrl(resume.photoUrl);
    var contacts = resume.contactsPublic && (contactsData.email || contactsData.phone)
        ? '<div class="work-resume-contacts">' + (contactsData.email ? '<a href="mailto:' + workEscape(contactsData.email) + '">✉ ' + workEscape(contactsData.email) + '</a>' : '') + (contactsData.phone ? '<a href="tel:' + workEscape(contactsData.phone.replace(/[^+\d]/g, '')) + '">📞 ' + workEscape(contactsData.phone) + '</a>' : '') + '</div>'
        : '<p class="work-private-note">Контакты скрыты. Можно связаться через профиль METAIMPERIYA.</p>';
    openWorkInfo('<div class="work-resume-detail">' + (photo ? '<img class="work-resume-detail-photo" src="' + workEscape(photo) + '" alt="">' : '<div class="work-resume-detail-photo work-resume-detail-initial">' + workEscape(Array.from(resume.name || '?')[0]) + '</div>') + '<div><span class="work-detail-kicker">РЕЗЮМЕ</span><h2>' + workEscape(resume.name) + '</h2><strong>' + workEscape(resume.title) + '</strong><p class="work-detail-meta">' + workEscape(resume.city || '') + (resume.experience ? ' · ' + workEscape(resume.experience) : '') + '</p></div></div><div class="work-detail-description">' + workEscape(resume.about || 'Описание пока не добавлено.').replace(/\n/g, '<br>') + '</div>' + contacts + '<button type="button" class="work-primary" data-resume-profile="' + workEscape(uid) + '">Открыть профиль</button>');
    var button = document.querySelector('[data-resume-profile]');
    if (button) button.onclick = function() { closeWorkModal('workInfoModal'); if (typeof viewUserProfile === 'function') viewUserProfile(uid); };
}

window.openWorkCreate = function() {
    if (workActiveTab === 'companies') window.openWorkCompanyModal();
    else if (workActiveTab === 'resumes') window.openWorkResumeModal();
    else {
        var owned = Object.keys(workCompanies).filter(function(id) { return workCompanies[id].ownerUid === USER_UID; });
        if (owned.length) window.openWorkVacancyModal(owned[0]);
        else window.openWorkCompanyModal();
    }
};

window.openWorkCompanyModal = function(id) {
    workEditingCompany = id || null;
    var company = id ? workCompanies[id] : {};
    if (id && (!company || company.ownerUid !== USER_UID)) return;
    document.getElementById('workCompanyModalTitle').textContent = id ? 'Настройки компании' : 'Новая компания';
    document.getElementById('workCompanyName').value = company.name || '';
    document.getElementById('workCompanyDescription').value = company.description || '';
    document.getElementById('workCompanyAvatar').value = company.avatarUrl || '';
    document.getElementById('workCompanyCover').value = company.coverUrl || '';
    document.getElementById('workCompanyError').textContent = '';
    document.getElementById('workCompanyModal').classList.add('open');
};

window.saveWorkCompany = function() {
    var name = document.getElementById('workCompanyName').value.trim();
    var description = document.getElementById('workCompanyDescription').value.trim();
    var avatarUrl = document.getElementById('workCompanyAvatar').value.trim();
    var coverUrl = document.getElementById('workCompanyCover').value.trim();
    var error = document.getElementById('workCompanyError');
    if (name.length < 2) { error.textContent = 'Название компании должно содержать хотя бы 2 символа.'; return; }
    if ((avatarUrl && !workUrl(avatarUrl)) || (coverUrl && !workUrl(coverUrl))) { error.textContent = 'Для изображений укажи полную ссылку http:// или https://.'; return; }
    var creatingCompany = !workEditingCompany;
    var createVacancyAfter = creatingCompany && workActiveTab === 'vacancies';
    var id = workEditingCompany || db.ref('sites/' + SITE + '/work_companies').push().key;
    var old = workCompanies[id] || {};
    var company = { name: name, description: description, avatarUrl: avatarUrl, coverUrl: coverUrl, ownerUid: USER_UID, ownerName: USER || 'Пользователь', createdAt: old.createdAt || Date.now() };
    db.ref('sites/' + SITE + '/work_companies/' + id).set(company).then(function() {
        workCompanies[id] = company;
        if (!workVacancies[id]) workVacancies[id] = {};
        window.closeWorkModal('workCompanyModal');
        renderWork();
        if (createVacancyAfter) {
            window.showWorkTab('companies');
            window.openWorkCompany(id);
        } else if (workActiveCompany === id) window.openWorkCompany(id);
    }).catch(function(saveError) { console.error('Ошибка сохранения компании:', saveError); error.textContent = saveError.code === 'PERMISSION_DENIED' ? 'Firebase запретил запись: опубликуй Database Rules для раздела «Работа».' : 'Не удалось сохранить компанию.'; });
};

window.openWorkVacancyModal = function(companyId) {
    var select = document.getElementById('workVacancyCompany');
    var owned = Object.keys(workCompanies).filter(function(id) { return workCompanies[id].ownerUid === USER_UID; });
    if (!owned.length) { window.openWorkCompanyModal(); return; }
    select.innerHTML = owned.map(function(id) { return '<option value="' + workEscape(id) + '">' + workEscape(workCompanies[id].name) + '</option>'; }).join('');
    if (companyId && owned.indexOf(companyId) !== -1) select.value = companyId;
    ['workVacancyTitle', 'workVacancyCity', 'workVacancySalary', 'workVacancyDescription'].forEach(function(id) { document.getElementById(id).value = ''; });
    document.getElementById('workVacancyError').textContent = '';
    document.getElementById('workVacancyModal').classList.add('open');
};

window.saveWorkVacancy = function() {
    var companyId = document.getElementById('workVacancyCompany').value;
    var company = workCompanies[companyId];
    var title = document.getElementById('workVacancyTitle').value.trim();
    var city = document.getElementById('workVacancyCity').value.trim();
    var salary = document.getElementById('workVacancySalary').value.trim();
    var description = document.getElementById('workVacancyDescription').value.trim();
    var error = document.getElementById('workVacancyError');
    if (!company || company.ownerUid !== USER_UID) { error.textContent = 'Выбери свою компанию.'; return; }
    if (title.length < 2 || !description) { error.textContent = 'Добавь должность и описание вакансии.'; return; }
    var vacancy = { title: title, city: city, salary: salary, description: description, companyId: companyId, companyName: company.name, ownerUid: USER_UID, createdAt: Date.now() };
    var ref = db.ref('sites/' + SITE + '/work_vacancies/' + companyId).push();
    ref.set(vacancy).then(function() {
        if (!workVacancies[companyId]) workVacancies[companyId] = {};
        workVacancies[companyId][ref.key] = vacancy;
        window.closeWorkModal('workVacancyModal');
        workActiveTab = 'vacancies';
        document.querySelector('[data-work-tab="vacancies"]').click();
    }).catch(function(saveError) { console.error('Ошибка публикации вакансии:', saveError); error.textContent = saveError.code === 'PERMISSION_DENIED' ? 'Firebase запретил запись: опубликуй Database Rules для раздела «Работа».' : 'Не удалось опубликовать вакансию.'; });
};

window.openWorkResumeModal = function() {
    var resume = workResumes[USER_UID] || {};
    document.getElementById('workResumeName').value = resume.name || USER || '';
    document.getElementById('workResumeTitle').value = resume.title || '';
    document.getElementById('workResumeCity').value = resume.city || '';
    document.getElementById('workResumeExperience').value = resume.experience || '';
    document.getElementById('workResumePhoto').value = resume.photoUrl || '';
    document.getElementById('workResumeAbout').value = resume.about || '';
    document.getElementById('workResumeEmail').value = workResumeContacts.email || '';
    document.getElementById('workResumePhone').value = workResumeContacts.phone || '';
    document.getElementById('workResumeContactsPublic').checked = !!resume.contactsPublic;
    document.getElementById('workResumeError').textContent = '';
    document.getElementById('workResumeModal').classList.add('open');
};

window.saveWorkResume = function() {
    var resume = {
        name: document.getElementById('workResumeName').value.trim(),
        title: document.getElementById('workResumeTitle').value.trim(),
        city: document.getElementById('workResumeCity').value.trim(),
        experience: document.getElementById('workResumeExperience').value.trim(),
        photoUrl: document.getElementById('workResumePhoto').value.trim(),
        about: document.getElementById('workResumeAbout').value.trim(),
        contactsPublic: document.getElementById('workResumeContactsPublic').checked,
        ownerUid: USER_UID,
        updatedAt: Date.now()
    };
    var error = document.getElementById('workResumeError');
    if (!resume.name || resume.title.length < 2) { error.textContent = 'Укажи имя и желаемую должность.'; return; }
    if (resume.photoUrl && !workUrl(resume.photoUrl)) { error.textContent = 'Для фото укажи полную ссылку http:// или https://.'; return; }
    var contacts = { email: document.getElementById('workResumeEmail').value.trim(), phone: document.getElementById('workResumePhone').value.trim() };
    if (contacts.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacts.email)) { error.textContent = 'Проверь адрес электронной почты.'; return; }
    var updates = {};
    updates['sites/' + SITE + '/work_resumes/' + USER_UID] = resume;
    updates['sites/' + SITE + '/work_resume_contacts/' + USER_UID] = contacts;
    db.ref().update(updates).then(function() {
        workResumes[USER_UID] = resume;
        workResumeContacts = contacts;
        window.closeWorkModal('workResumeModal');
        workActiveTab = 'resumes';
        document.querySelector('[data-work-tab="resumes"]').click();
    }).catch(function(saveError) { console.error('Ошибка сохранения резюме:', saveError); error.textContent = saveError.code === 'PERMISSION_DENIED' ? 'Firebase запретил запись: опубликуй Database Rules для раздела «Работа».' : 'Не удалось сохранить резюме.'; });
};

window.closeWorkModal = function(id) {
    var modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
};

document.getElementById('workSearch').addEventListener('input', renderWork);
document.querySelectorAll('[data-work-tab]').forEach(function(button) { button.addEventListener('click', function() { workActiveTab = button.getAttribute('data-work-tab'); }); });
