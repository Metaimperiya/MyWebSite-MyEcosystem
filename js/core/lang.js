// ================================================================ */
// ПЕРЕВОД НА ДВА ЯЗЫКА — С АВТООПРЕДЕЛЕНИЕМ
// ================================================================ */

const LANGUAGES = {
    ru: {
        app_name: 'METAIMPERIYA',
        menu: 'Меню',
        messages: 'Сообщения',
        profile: 'Профиль',
        settings: 'Настройки',
        logout: 'Выйти',
        theme: 'Тема',
        privacy: 'Приватность',
        help: 'Помощь',
        feed: 'Лента',
        what_new: 'Что у вас нового?',
        photo: 'Фото',
        publish: 'Опубликовать',
        clear: 'Очистить',
        empty_feed: 'Пока пусто',
        login_to_see: 'Войдите, чтобы видеть ленту',
        guest: 'Гость',
        setup_profile: 'Настройте профиль',
        edit_profile: 'Редактировать профиль',
        change_avatar: 'Сменить аватар',
        go_home: 'На главную',
        friends: 'Друзья',
        subscribers: 'Подписчики',
        subscriptions: 'Подписки',
        no_posts: '📝 Нет постов. Напишите что-нибудь!',
        loading: 'Загрузка...',
        my_posts: 'Мои посты',
        friends_title: '🤝 Друзья',
        no_friends: 'Нет друзей',
        enter_link: 'Вставьте ссылку для встраивания...',
        embedded_page: 'Встроенная страница',
        collapse: 'Свернуть',
        expand: 'Развернуть',
        link_saved: '✅ Ссылка сохранена!',
        avatar_updated: '✅ Аватарка обновлена!',
        groups: 'Группы',
        create_group: 'Создать группу',
        new_group: 'Новая группа',
        group_name: 'Название...',
        create: 'Создать',
        people: 'Люди',
        all_users: 'Все пользователи',
        add_friend: '➕ Добавить в друзья',
        already_friends: '🤝 В друзьях',
        request_sent: '⏳ Запрос отправлен',
        request_received: '📩 Заявка получена',
        accept: 'Принять',
        decline: 'Отклонить',
        remove_from_friends: 'Удалить из друзей',
        chat: 'Чат',
        back: 'Назад',
        message: 'Сообщение...',
        no_messages: 'Сообщений нет',
        delete_message: 'Удалить сообщение',
        chat_list_empty: '🤝 Добавьте друзей, чтобы начать общение',
        cannot_write_self: 'Нельзя писать себе',
        notifications: 'Уведомления',
        no_notifications: 'Нет уведомлений',
        admin: 'Админ',
        admin_password: 'Пароль...',
        admin_login: 'Войти',
        all_chats: 'Все чаты',
        no_chats: 'Нет личных чатов',
        edit_post: '✏️ Редактировать',
        delete_post: '🗑 Удалить',
        restore_post: '↩️ Восстановить',
        post_deleted: '🗑 Пост удален',
        enter_link_placeholder: 'Введите ссылку:',
        link_text: 'ссылка',
        login_title: '👤 Вход',
        login_google: 'Войти через Google',
        or: 'или',
        enter_name_placeholder: 'Введите имя...',
        cancel: 'Отмена',
        login: 'Войти',
        player: 'ПЛЕЕР',
        playlist: 'Плейлист',
        download: 'Скачать',
        visualizer: 'Визуализация',
        online: 'онлайн',
        edit: 'Редактировать',
        delete: 'Удалить',
        save: 'Сохранить',
        close: 'Закрыть',
        confirm: 'Подтвердить',
        post_updated: '✅ Пост обновлён!',
        repost_created: '✅ Репост создан!',
        search: 'Поиск',
        add: 'Добавить',
        remove: 'Удалить',
    },
    en: {
        app_name: 'METAIMPERIYA',
        menu: 'Menu',
        messages: 'Messages',
        profile: 'Profile',
        settings: 'Settings',
        logout: 'Logout',
        theme: 'Theme',
        privacy: 'Privacy',
        help: 'Help',
        feed: 'Feed',
        what_new: "What's new?",
        photo: 'Photo',
        publish: 'Publish',
        clear: 'Clear',
        empty_feed: 'Nothing yet',
        login_to_see: 'Login to see feed',
        guest: 'Guest',
        setup_profile: 'Set up your profile',
        edit_profile: 'Edit profile',
        change_avatar: 'Change avatar',
        go_home: 'Go home',
        friends: 'Friends',
        subscribers: 'Subscribers',
        subscriptions: 'Subscriptions',
        no_posts: '📝 No posts. Write something!',
        loading: 'Loading...',
        my_posts: 'My posts',
        friends_title: '🤝 Friends',
        no_friends: 'No friends',
        enter_link: 'Enter a link to embed...',
        embedded_page: 'Embedded page',
        collapse: 'Collapse',
        expand: 'Expand',
        link_saved: '✅ Link saved!',
        avatar_updated: '✅ Avatar updated!',
        groups: 'Groups',
        create_group: 'Create group',
        new_group: 'New group',
        group_name: 'Name...',
        create: 'Create',
        people: 'People',
        all_users: 'All users',
        add_friend: '➕ Add friend',
        already_friends: '🤝 Friends',
        request_sent: '⏳ Request sent',
        request_received: '📩 Request received',
        accept: 'Accept',
        decline: 'Decline',
        remove_from_friends: 'Remove from friends',
        chat: 'Chat',
        back: 'Back',
        message: 'Message...',
        no_messages: 'No messages',
        delete_message: 'Delete message',
        chat_list_empty: '🤝 Add friends to start chatting',
        cannot_write_self: "Can't write to yourself",
        notifications: 'Notifications',
        no_notifications: 'No notifications',
        admin: 'Admin',
        admin_password: 'Password...',
        admin_login: 'Login',
        all_chats: 'All chats',
        no_chats: 'No private chats',
        edit_post: '✏️ Edit',
        delete_post: '🗑 Delete',
        restore_post: '↩️ Restore',
        post_deleted: '🗑 Post deleted',
        enter_link_placeholder: 'Enter link:',
        link_text: 'link',
        login_title: '👤 Login',
        login_google: 'Login with Google',
        or: 'or',
        enter_name_placeholder: 'Enter name...',
        cancel: 'Cancel',
        login: 'Login',
        player: 'PLAYER',
        playlist: 'Playlist',
        download: 'Download',
        visualizer: 'Visualizer',
        online: 'online',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        close: 'Close',
        confirm: 'Confirm',
        post_updated: '✅ Post updated!',
        repost_created: '✅ Repost created!',
        search: 'Search',
        add: 'Add',
        remove: 'Remove',
    }
};

// ================================================================ */
// АВТООПРЕДЕЛЕНИЕ ЯЗЫКА
// ================================================================ */

function getBrowserLang() {
    var lang = navigator.language || navigator.userLanguage || 'ru';
    if (lang.startsWith('en')) {
        return 'en';
    }
    return 'ru';
}

let currentLang = localStorage.getItem('lang') || getBrowserLang();

// ================================================================ */
// ФУНКЦИИ ПЕРЕВОДА
// ================================================================ */

function t(key) {
    return LANGUAGES[currentLang]?.[key] || key;
}

function setLanguage(lang) {
    if (LANGUAGES[lang]) {
        currentLang = lang;
        localStorage.setItem('lang', lang);
        translatePage();
        updateLangDisplay();
    }
}

function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = t(key);
        if (translation !== key) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.getAttribute('data-i18n-placeholder')) {
                    el.placeholder = translation;
                }
            } else if (el.tagName === 'BUTTON') {
                // Для кнопок с иконками не меняем текст
            } else {
                el.textContent = translation;
            }
        }
    });

    document.title = t('app_name') + ' — ' + (currentLang === 'ru' ? 'Социальная платформа' : 'Social Platform');
}

function updateLangDisplay() {
    var display = document.getElementById('langDisplay');
    if (display) {
        display.textContent = currentLang === 'ru' ? 'Русский' : 'English';
    }
}

// ================================================================ */
// ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА
// ================================================================ */

window.toggleLanguage = function() {
    var newLang = currentLang === 'ru' ? 'en' : 'ru';
    setLanguage(newLang);
};

// ================================================================ */
// АВТОПЕРЕВОД ПРИ ЗАГРУЗКЕ
// ================================================================ */

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        translatePage();
        updateLangDisplay();
    }, 500);
});

window.addEventListener('load', function() {
    setTimeout(function() {
        translatePage();
        updateLangDisplay();
    }, 300);
});
