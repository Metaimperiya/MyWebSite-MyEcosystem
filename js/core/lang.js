// ================================================================
// ГЛАВНЫЙ ФАЙЛ ЯЗЫКОВ — ПОДКЛЮЧАЕТ ВСЕ ЯЗЫКИ
// ================================================================

// ===== ПОДКЛЮЧАЕМ ВСЕ ЯЗЫКИ =====
var LANGUAGES = {};

function loadLanguage(langCode) {
    var script = document.createElement('script');
    script.src = 'js/core/languages/' + langCode + '.js';
    script.onload = function() {
        console.log('✅ Язык загружен:', langCode);
    };
    script.onerror = function() {
        console.error('❌ Ошибка загрузки языка:', langCode);
    };
    document.head.appendChild(script);
}

// Загружаем все языки
loadLanguage('en');
loadLanguage('ru');
loadLanguage('uk');
loadLanguage('es');
loadLanguage('de');
loadLanguage('tr');
loadLanguage('hi');
loadLanguage('bn');
loadLanguage('ur');
loadLanguage('fa');
loadLanguage('he');
loadLanguage('ar');

// ===== ОПРЕДЕЛЕНИЕ СТРАНЫ ПО IP =====
function detectCountry() {
    return new Promise(function(resolve) {
        fetch('https://ipapi.co/json/')
            .then(function(response) {
                if (!response.ok) throw new Error('Network error');
                return response.json();
            })
            .then(function(data) {
                var country = data.country_code || 'US';
                console.log('🌍 Определена страна:', country);
                resolve(country);
            })
            .catch(function() {
                fetch('https://ip-api.com/json/')
                    .then(function(response) {
                        if (!response.ok) throw new Error('Network error');
                        return response.json();
                    })
                    .then(function(data) {
                        var country = data.countryCode || 'US';
                        console.log('🌍 Определена страна (fallback):', country);
                        resolve(country);
                    })
                    .catch(function() {
                        console.log('🌍 Не удалось определить страну, ставим US');
                        resolve('US');
                    });
            });
    });
}

// ===== ОПРЕДЕЛЕНИЕ ЯЗЫКА ПО СТРАНЕ =====
function getLanguageByCountry(country) {
    var map = {
        'UA': 'uk',
        'RU': 'ru', 
        'BY': 'ru', 
        'KZ': 'ru',
        'ES': 'es', 
        'MX': 'es', 
        'AR': 'es', 
        'CO': 'es', 
        'CL': 'es', 
        'PE': 'es', 
        'VE': 'es',
        'DE': 'de', 
        'AT': 'de', 
        'CH': 'de',
        'TR': 'tr',
        'IN': 'hi',
        'BD': 'bn',
        'PK': 'ur',
        'IR': 'fa',
        'IL': 'he',
        'QA': 'ar', 
        'SA': 'ar', 
        'AE': 'ar', 
        'KW': 'ar', 
        'BH': 'ar', 
        'OM': 'ar',
        'YE': 'ar', 
        'JO': 'ar', 
        'LB': 'ar', 
        'EG': 'ar', 
        'DZ': 'ar', 
        'MA': 'ar',
        'TN': 'ar', 
        'LY': 'ar', 
        'SD': 'ar', 
        'SY': 'ar', 
        'IQ': 'ar',
        'US': 'en', 
        'GB': 'en', 
        'AU': 'en', 
        'CA': 'en', 
        'NZ': 'en', 
        'IE': 'en', 
        'ZA': 'en'
    };
    return map[country] || 'en';
}

// ===== УСТАНОВКА ЯЗЫКА =====
var currentLang = localStorage.getItem('lang') || 'en';
var availableLanguages = ['en', 'ru', 'uk', 'es', 'de', 'tr', 'hi', 'bn', 'ur', 'fa', 'he', 'ar'];

function getLanguageObject(lang) {
    var key = 'LANG_' + lang.toUpperCase();
    return window[key] || window.LANG_EN || {};
}

// ===== ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ СМЕНЫ ЯЗЫКА =====
window.setLanguage = function(lang) {
    console.log('🔵 setLanguage вызвана с:', lang);
    
    if (availableLanguages.indexOf(lang) === -1) {
        console.warn('⚠️ Язык не найден, ставим en');
        lang = 'en';
    }
    
    currentLang = lang;
    localStorage.setItem('lang', lang);
    
    // Переводим страницу
    translatePage();
    updateLangDisplay();
    closeLanguageMenu();
    
    console.log('🌍 Язык установлен:', lang);
};

function setLanguageInternal(lang) {
    window.setLanguage(lang);
}

function t(key) {
    var langObj = getLanguageObject(currentLang);
    var result = langObj[key] || window.LANG_EN[key] || key;
    return result;
}

function translatePage() {
    console.log('🔄 translatePage вызвана, текущий язык:', currentLang);
    
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        var translation = t(key);
        if (translation !== key) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                if (el.getAttribute('data-i18n-placeholder')) {
                    el.placeholder = translation;
                }
            } else {
                el.textContent = translation;
            }
        }
    });

    document.title = t('app_name') + ' — Social Platform';
    console.log('✅ Перевод применён');
}

function updateLangDisplay() {
    var display = document.getElementById('langDisplay');
    if (display) {
        var names = {
            'en': 'English', 
            'ru': 'Русский', 
            'uk': 'Українська',
            'es': 'Español',
            'de': 'Deutsch', 
            'tr': 'Türkçe', 
            'hi': 'हिन्दी',
            'bn': 'বাংলা', 
            'ur': 'اردو', 
            'fa': 'فارسی',
            'he': 'עברית', 
            'ar': 'العربية'
        };
        display.textContent = names[currentLang] || 'English';
        console.log('🔄 langDisplay обновлён:', display.textContent);
    }
}

// ===== ОТКРЫТИЕ/ЗАКРЫТИЕ МЕНЮ ЯЗЫКОВ =====
window.toggleLanguageMenu = function() {
    var menu = document.getElementById('languageMenu');
    if (!menu) {
        console.error('❌ languageMenu не найден');
        return;
    }
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    console.log('🔄 Меню языков:', menu.style.display);
};

window.closeLanguageMenu = function() {
    var menu = document.getElementById('languageMenu');
    if (menu) menu.style.display = 'none';
};

// Закрываем меню при клике вне
document.addEventListener('click', function(e) {
    if (!e.target.closest('.settings-item') && !e.target.closest('#languageMenu')) {
        var menu = document.getElementById('languageMenu');
        if (menu) menu.style.display = 'none';
    }
});

// ===== ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА (для обратной совместимости) =====
window.toggleLanguage = function() {
    console.log('🔄 toggleLanguage вызвана');
    var currentIndex = availableLanguages.indexOf(currentLang);
    var nextIndex = (currentIndex + 1) % availableLanguages.length;
    window.setLanguage(availableLanguages[nextIndex]);
};

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 DOMContentLoaded — инициализация языков');
    
    var savedLang = localStorage.getItem('lang');
    if (savedLang && availableLanguages.indexOf(savedLang) !== -1) {
        currentLang = savedLang;
        translatePage();
        updateLangDisplay();
        console.log('🌍 Используем сохранённый язык:', currentLang);
        return;
    }

    detectCountry().then(function(country) {
        var detectedLang = getLanguageByCountry(country);
        window.setLanguage(detectedLang);
    }).catch(function() {
        window.setLanguage('en');
    });
});

window.addEventListener('load', function() {
    setTimeout(function() {
        translatePage();
        updateLangDisplay();
    }, 500);
});

console.log('✅ lang.js загружен (языки в отдельных файлах)');
console.log('🌍 Доступные языки:', availableLanguages);
