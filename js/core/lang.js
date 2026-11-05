// Site-wide localization. Language files are small dictionaries shared by
// static markup and UI rendered later by the feature modules.
var availableLanguages = ['en', 'ru', 'tr', 'ar', 'es', 'it', 'de', 'zh', 'ja', 'uk', 'hi', 'bn', 'ur', 'fa', 'he'];
var languageNames = {
    en: 'English', ru: 'Русский', tr: 'Türkçe', ar: 'العربية', es: 'Español',
    it: 'Italiano', de: 'Deutsch', zh: '简体中文', ja: '日本語', uk: 'Українська', hi: 'हिन्दी', bn: 'বাংলা',
    ur: 'اردو', fa: 'فارسی', he: 'עברית'
};
var loadedLanguageCodes = [];
var languageLoadPromise = Promise.all(availableLanguages.map(loadLanguage)).then(function() {
    return new Promise(function(resolve) {
        var script = document.createElement('script');
        script.src = 'js/core/languages/site-extra.js?v=3.0';
        script.onload = function() {
            availableLanguages.forEach(function(code) {
                var dictionary = getLanguageObject(code);
                var extra = window['LANG_' + code.toUpperCase() + '_EXTRA'] || {};
                Object.keys(extra).forEach(function(key) { dictionary[key] = extra[key]; });
            });
            resolve();
        };
        script.onerror = function() { console.error('Additional translations failed to load'); resolve(); };
        document.head.appendChild(script);
    });
});
var currentLang = (function() {
    try {
        var saved = localStorage.getItem('lang');
        return availableLanguages.indexOf(saved) !== -1 ? saved : 'en';
    } catch (error) { return 'en'; }
})();
var languageObserver = null;
var languageTranslationScheduled = false;

function loadLanguage(langCode) {
    return new Promise(function(resolve) {
        var script = document.createElement('script');
        script.src = 'js/core/languages/' + langCode + '.js?v=5.0';
        script.onload = function() { loadedLanguageCodes.push(langCode); resolve(); };
        script.onerror = function() { console.error('Language file failed to load:', langCode); resolve(); };
        document.head.appendChild(script);
    });
}

function getLanguageObject(lang) {
    return window['LANG_' + String(lang || '').toUpperCase()] || window.LANG_EN || {};
}

function t(key) {
    var localized = getLanguageObject(currentLang)[key];
    return localized || (window.LANG_EN && window.LANG_EN[key]) || key;
}

function makePhraseIndex() {
    var index = Object.create(null);
    loadedLanguageCodes.forEach(function(code) {
        var dictionary = getLanguageObject(code);
        Object.keys(dictionary).forEach(function(key) {
            var phrase = String(dictionary[key] == null ? '' : dictionary[key]).trim();
            if (phrase && !index[phrase]) index[phrase] = key;
        });
    });
    return index;
}

function localizePhrase(value, phraseIndex) {
    var phrase = String(value == null ? '' : value).trim();
    if (!phrase) return value;
    var key = phraseIndex[phrase];
    if (!key) return value;
    var translated = t(key);
    if (!translated || translated === key) return value;
    var start = String(value).indexOf(phrase);
    return String(value).slice(0, start) + translated + String(value).slice(start + phrase.length);
}

function isUserContent(node) {
    var parent = node && node.parentElement;
    return !!(parent && parent.closest('[data-no-translate], .post-text, .comment-text, .comment-item .text, .group-post-text, .message-bubble, .chat-message-text, .profile-about, .profile-bio, .user-content, .user-generated-text, .username, .profile-name, .group-name'));
}

function translateElement(element, phraseIndex) {
    if (!element || element.nodeType !== 1) return;
    var explicitKey = element.getAttribute('data-i18n');
    if (explicitKey) {
        var explicitTranslation = t(explicitKey);
        if (element.matches('input,textarea')) {
            if (element.hasAttribute('data-i18n-placeholder')) element.placeholder = explicitTranslation;
        } else if (element.childElementCount === 0) {
            element.textContent = explicitTranslation;
        }
    }
    ['placeholder', 'title', 'aria-label'].forEach(function(attribute) {
        if (element.hasAttribute(attribute)) {
            var before = element.getAttribute(attribute);
            var after = localizePhrase(before, phraseIndex);
            if (after !== before) element.setAttribute(attribute, after);
        }
    });
    if (element.matches('input[type="button"],input[type="submit"]')) {
        var value = localizePhrase(element.value, phraseIndex);
        if (value !== element.value) element.value = value;
    }
}

function translatePage() {
    var phraseIndex = makePhraseIndex();
    document.documentElement.lang = currentLang;
    document.documentElement.dir = (currentLang === 'ar' || currentLang === 'he' || currentLang === 'fa' || currentLang === 'ur') ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n], [placeholder], [title], [aria-label], input[type="button"], input[type="submit"]').forEach(function(element) {
        translateElement(element, phraseIndex);
    });

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
        if (!node.parentElement || node.parentElement.closest('script,style,textarea') || isUserContent(node)) continue;
        var translated = localizePhrase(node.nodeValue, phraseIndex);
        if (translated !== node.nodeValue) node.nodeValue = translated;
    }

    document.title = t('site_title');
    var landingLanguageSelect = document.getElementById('landingLanguageSelect');
    if (landingLanguageSelect && landingLanguageSelect.value !== currentLang) landingLanguageSelect.value = currentLang;
    updateLangDisplay();
}

function schedulePageTranslation() {
    if (languageTranslationScheduled) return;
    languageTranslationScheduled = true;
    requestAnimationFrame(function() {
        languageTranslationScheduled = false;
        translatePage();
    });
}

function installLanguageObserver() {
    if (languageObserver || !document.body) return;
    languageObserver = new MutationObserver(function(records) {
        var phraseIndex = makePhraseIndex();
        records.forEach(function(record) {
            if (record.type === 'characterData') {
                if (isUserContent(record.target)) return;
                var newText = localizePhrase(record.target.nodeValue, phraseIndex);
                if (newText !== record.target.nodeValue) record.target.nodeValue = newText;
                return;
            }
            record.addedNodes.forEach(function(added) {
                if (added.nodeType === 3) {
                    var translated = localizePhrase(added.nodeValue, phraseIndex);
                    if (translated !== added.nodeValue) added.nodeValue = translated;
                } else if (added.nodeType === 1) {
                    translateElement(added, phraseIndex);
                    var walker = document.createTreeWalker(added, NodeFilter.SHOW_TEXT);
                    var textNode;
                    while ((textNode = walker.nextNode())) {
                        if (textNode.parentElement && !textNode.parentElement.closest('script,style,textarea') && !isUserContent(textNode)) {
                            var replacement = localizePhrase(textNode.nodeValue, phraseIndex);
                            if (replacement !== textNode.nodeValue) textNode.nodeValue = replacement;
                        }
                    }
                    added.querySelectorAll('[data-i18n], [placeholder], [title], [aria-label], input[type="button"], input[type="submit"]').forEach(function(element) {
                        translateElement(element, phraseIndex);
                    });
                }
            });
        });
    });
    languageObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
}

window.setLanguage = function(lang) {
    if (availableLanguages.indexOf(lang) === -1) lang = 'en';
    currentLang = lang;
    try { localStorage.setItem('lang', lang); } catch (error) { /* storage may be disabled */ }
    languageLoadPromise.then(function() {
        translatePage();
        closeLanguageMenu();
    });
};

function normalizeTranslatorLanguage(code) {
    var normalized = String(code || '').toLowerCase();
    if (normalized.indexOf('zh') === 0) return 'zh';
    if (normalized.indexOf('ja') === 0) return 'ja';
    return normalized.split(/[-_]/)[0];
}

window.translateFeedComment = async function(button) {
    if (!button) return;
    var item = button.closest('.comment-item');
    if (!item) return;
    var original = item.querySelector('.text');
    var output = item.querySelector('.comment-translation');
    var status = item.querySelector('.comment-translation-status');
    if (!original || !output) return;
    if (!output.hidden) {
        output.hidden = true;
        button.textContent = t('translate_comment');
        return;
    }
    if (output.textContent) {
        output.hidden = false;
        button.textContent = t('translate_original');
        return;
    }
    if (!('LanguageDetector' in window) || !('Translator' in window)) {
        if (status) status.textContent = t('translator_unavailable');
        return;
    }
    var sourceText = original.textContent.trim();
    if (!sourceText) return;
    button.disabled = true;
    button.textContent = t('translating');
    if (status) status.textContent = '';
    try {
        var detector = await window.LanguageDetector.create();
        var detections = await detector.detect(sourceText);
        var best = detections && detections[0];
        var sourceLanguage = normalizeTranslatorLanguage(best && best.detectedLanguage);
        var targetLanguage = normalizeTranslatorLanguage(currentLang);
        if (!sourceLanguage || (typeof best.confidence === 'number' && best.confidence < 0.15)) {
            if (status) status.textContent = t('source_language_unknown');
            return;
        }
        if (sourceLanguage === targetLanguage) {
            if (status) status.textContent = t('same_language');
            return;
        }
        var translator = await window.Translator.create({ sourceLanguage: sourceLanguage, targetLanguage: targetLanguage });
        var translatedText = await translator.translate(sourceText);
        output.textContent = translatedText;
        output.hidden = false;
        button.textContent = t('translate_original');
    } catch (error) {
        console.warn('On-device comment translation failed:', error);
        if (status) status.textContent = t('translate_failed');
    } finally {
        button.disabled = false;
        if (output.hidden && button.textContent === t('translating')) button.textContent = t('translate_comment');
    }
};

window.toggleLanguage = function() {
    var menu = document.getElementById('languageMenu');
    if (!menu) return;
    var isOpen = !menu.hidden;
    menu.hidden = isOpen;
    if (!isOpen) {
        menu.querySelectorAll('[data-language]').forEach(function(button) {
            button.setAttribute('aria-pressed', button.getAttribute('data-language') === currentLang ? 'true' : 'false');
        });
    }
};

window.closeLanguageMenu = function() {
    var menu = document.getElementById('languageMenu');
    if (menu) menu.hidden = true;
};

window.updateLangDisplay = function() {
    var display = document.getElementById('langDisplay');
    if (display) display.textContent = languageNames[currentLang] || 'English';
};

function preferredBrowserLanguage() {
    var preferences = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    for (var i = 0; i < preferences.length; i++) {
        var code = String(preferences[i]).toLowerCase().split(/[-_]/)[0];
        if (availableLanguages.indexOf(code) !== -1) return code;
    }
    return 'en';
}

languageLoadPromise.then(function() {
    var saved;
    try { saved = localStorage.getItem('lang'); } catch (error) { saved = null; }
    if (!saved || availableLanguages.indexOf(saved) === -1) currentLang = preferredBrowserLanguage();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { installLanguageObserver(); translatePage(); }, { once: true });
    } else {
        installLanguageObserver();
        translatePage();
    }
});

document.addEventListener('click', function(event) {
    var menu = document.getElementById('languageMenu');
    if (menu && !menu.hidden && !event.target.closest('#languageMenu') && !event.target.closest('[data-language-trigger]')) closeLanguageMenu();
});
