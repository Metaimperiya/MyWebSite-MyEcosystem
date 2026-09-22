/* ================================================================
 * DOSS OS — CALCULATOR (рабочий)
 * ================================================================ */

(function () {
    'use strict';

    var state = {
        expr: '',
        result: '0'
    };

    function updateDisplay() {
        var exprEl = document.getElementById('dossCalcExpr');
        var resEl = document.getElementById('dossCalcResult');
        if (exprEl) exprEl.textContent = state.expr || '0';
        if (resEl) resEl.textContent = state.result;
    }

    function safeEval(expr) {
        if (!/^[0-9+\-*/().\s]+$/.test(expr)) return 'Ошибка';
        try {
            var v = Function('"use strict";return (' + expr + ')')();
            if (typeof v !== 'number' || !isFinite(v)) return 'Ошибка';
            return String(v);
        } catch (e) {
            return 'Ошибка';
        }
    }

    window.dossCalcInput = function (ch) {
        if (ch === 'C') {
            state.expr = '';
            state.result = '0';
        } else if (ch === '⌫') {
            state.expr = state.expr.slice(0, -1);
        } else if (ch === '=') {
            state.result = safeEval(state.expr);
        } else {
            state.expr += ch;
        }
        updateDisplay();
    };

    window.renderDossCalculator = function (root) {
        if (!root) return;

        var buttons = [
            'C', '⌫', '(', ')',
            '7', '8', '9', '/',
            '4', '5', '6', '*',
            '1', '2', '3', '-',
            '0', '.', '=', '+'
        ];

        var html =
            '<section class="doss-calculator">' +
                '<h1>🧮 Калькулятор</h1>' +
                '<div class="doss-calc__display">' +
                    '<div class="doss-calc__expr" id="dossCalcExpr">0</div>' +
                    '<div class="doss-calc__result" id="dossCalcResult">0</div>' +
                '</div>' +
                '<div class="doss-calc__grid">' +
                    buttons.map(function (b) {
                        var cls = 'doss-calc__btn';
                        if ('+-*/'.indexOf(b) !== -1) cls += ' is-op';
                        if (b === '=') cls += ' is-eq';
                        if (b === 'C' || b === '⌫') cls += ' is-fn';
                        return '<button type="button" class="' + cls + '" onclick="dossCalcInput(\'' + b + '\')">' + b + '</button>';
                    }).join('') +
                '</div>' +
                '<p class="doss-calc__note">Пока это обычный калькулятор. Проценты, НДС, кредит, валюты, даты — на следующем этапе.</p>' +
            '</section>';

        root.innerHTML = html;

        state.expr = '';
        state.result = '0';
        updateDisplay();
    };

    console.log('✅ DOSS calculator загружен');
})();
