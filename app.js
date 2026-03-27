/* === Telegram WebApp Init === */

const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

/* === State === */

const state = {
    type: null,
    pages: null,
    design: null,
    features: [],
    timeline: null,
    history: [1],
};

/* === Price calculation (mirrors bot logic) === */

const USD_RATE = 85;

const BASE_PRICES = {
    landing: 10000,
    card: 10000,
    corporate: 25000,
    shop: 25000,
};

const PAGE_MULTIPLIERS = {
    '1_3': 1.0,
    '4_7': 1.4,
    '8_15': 1.8,
    '15plus': 2.5,
};

const DESIGN_MULTIPLIERS = {
    ready: 1.0,
    examples: 1.2,
    needed: 1.5,
};

const FEATURE_COSTS = {
    forms: 2000,
    crm: 5000,
    catalog: 8000,
    payment: 5000,
    i18n: 5000,
    seo: 3000,
};

const URGENCY = {
    standard: 1.0,
    urgent: 1.5,
};

function calculatePrice() {
    let base = BASE_PRICES[state.type] || 15000;
    base *= PAGE_MULTIPLIERS[state.pages] || 1.0;
    base *= DESIGN_MULTIPLIERS[state.design] || 1.0;

    const featuresCost = state.features.reduce((sum, f) => sum + (FEATURE_COSTS[f] || 0), 0);
    let total = base + featuresCost;
    total *= URGENCY[state.timeline] || 1.0;

    const min = Math.round(total * 0.9);
    const max = Math.round(total * 1.1);
    return { min, max };
}

function formatPrice(amount) {
    const rub = amount.toLocaleString('ru-RU') + ' ₽';
    const usd = Math.round(amount / USD_RATE);
    return `${rub} (~$${usd})`;
}

/* === Navigation === */

const TOTAL_STEPS = 5;

function goToStep(stepNum) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('step--active'));

    const target = document.querySelector(`[data-step="${stepNum}"]`);
    if (target) {
        target.classList.add('step--active');
    }

    const backBtn = document.getElementById('backBtn');
    backBtn.style.display = stepNum === 1 ? 'none' : 'block';

    if (stepNum !== 'result') {
        const progress = (stepNum / TOTAL_STEPS) * 100;
        document.getElementById('progressBar').style.width = progress + '%';
    } else {
        document.getElementById('progressBar').style.width = '100%';
        showResult();
    }

    if (typeof stepNum === 'number') {
        state.history.push(stepNum);
    }
}

function goBack() {
    state.history.pop();
    const prev = state.history[state.history.length - 1] || 1;
    document.querySelectorAll('.step').forEach(s => s.classList.remove('step--active'));
    const target = document.querySelector(`[data-step="${prev}"]`);
    if (target) target.classList.add('step--active');

    const backBtn = document.getElementById('backBtn');
    backBtn.style.display = prev === 1 ? 'none' : 'block';

    const progress = (prev / TOTAL_STEPS) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

/* === Result === */

const TYPE_LABELS = {
    landing: 'Лендинг',
    card: 'Сайт-визитка',
    corporate: 'Корпоративный сайт',
    shop: 'Интернет-магазин',
};

const PAGES_LABELS = {
    '1_3': '1-3 страницы',
    '4_7': '4-7 страниц',
    '8_15': '8-15 страниц',
    '15plus': '15+ страниц',
};

const DESIGN_LABELS = {
    ready: 'Есть макет',
    examples: 'Есть референсы',
    needed: 'Дизайн с нуля',
};

const FEATURE_LABELS = {
    forms: 'Формы',
    crm: 'CRM',
    catalog: 'Каталог',
    payment: 'Оплата',
    i18n: 'Мультиязычность',
    seo: 'SEO',
};

const TIMELINE_LABELS = {
    standard: 'Стандартные сроки',
    urgent: 'Срочно',
};

function showResult() {
    const { min, max } = calculatePrice();

    document.getElementById('resultPrice').textContent =
        formatPrice(min) + ' - ' + formatPrice(max);

    const features = state.features.length
        ? state.features.map(f => FEATURE_LABELS[f]).join(', ')
        : 'не выбран';

    document.getElementById('resultSummary').innerHTML =
        `<span>Тип:</span> ${TYPE_LABELS[state.type]}<br>` +
        `<span>Страниц:</span> ${PAGES_LABELS[state.pages]}<br>` +
        `<span>Дизайн:</span> ${DESIGN_LABELS[state.design]}<br>` +
        `<span>Функционал:</span> ${features}<br>` +
        `<span>Сроки:</span> ${TIMELINE_LABELS[state.timeline]}`;
}

/* === Event handlers === */

/* Options (single select) */
document.querySelectorAll('.option[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
        state.type = btn.dataset.type;
        btn.closest('.step__options').querySelectorAll('.option').forEach(o => o.classList.remove('option--selected'));
        btn.classList.add('option--selected');
        setTimeout(() => goToStep(Number(btn.dataset.next)), 200);
    });
});

document.querySelectorAll('.option[data-pages]').forEach(btn => {
    btn.addEventListener('click', () => {
        state.pages = btn.dataset.pages;
        btn.closest('.step__options').querySelectorAll('.option').forEach(o => o.classList.remove('option--selected'));
        btn.classList.add('option--selected');
        setTimeout(() => goToStep(Number(btn.dataset.next)), 200);
    });
});

document.querySelectorAll('.option[data-design]').forEach(btn => {
    btn.addEventListener('click', () => {
        state.design = btn.dataset.design;
        btn.closest('.step__options').querySelectorAll('.option').forEach(o => o.classList.remove('option--selected'));
        btn.classList.add('option--selected');
        setTimeout(() => goToStep(Number(btn.dataset.next)), 200);
    });
});

document.querySelectorAll('.option[data-timeline]').forEach(btn => {
    btn.addEventListener('click', () => {
        state.timeline = btn.dataset.timeline;
        btn.closest('.step__options').querySelectorAll('.option').forEach(o => o.classList.remove('option--selected'));
        btn.classList.add('option--selected');
        setTimeout(() => goToStep(btn.dataset.next), 200);
    });
});

/* Chips (multi select) */
document.querySelectorAll('.chip[data-feature]').forEach(chip => {
    chip.addEventListener('click', () => {
        const feature = chip.dataset.feature;
        const idx = state.features.indexOf(feature);
        if (idx > -1) {
            state.features.splice(idx, 1);
            chip.classList.remove('chip--selected');
        } else {
            state.features.push(feature);
            chip.classList.add('chip--selected');
        }
    });
});

/* Next button (step 4) */
document.querySelectorAll('.btn[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
        goToStep(Number(btn.dataset.next));
    });
});

/* Back */
document.getElementById('backBtn').addEventListener('click', goBack);

/* Restart */
document.getElementById('btnRestart').addEventListener('click', () => {
    state.type = null;
    state.pages = null;
    state.design = null;
    state.features = [];
    state.timeline = null;
    state.history = [1];

    document.querySelectorAll('.option--selected, .chip--selected').forEach(el => {
        el.classList.remove('option--selected', 'chip--selected');
    });

    goToStep(1);
});

/* Submit - send data to bot */
document.getElementById('btnSubmit').addEventListener('click', () => {
    if (tg) {
        const { min, max } = calculatePrice();
        const data = JSON.stringify({
            type: state.type,
            pages: state.pages,
            design: state.design,
            features: state.features,
            timeline: state.timeline,
            price_min: min,
            price_max: max,
        });
        tg.sendData(data);
    } else {
        alert('Откройте через Telegram для отправки заявки');
    }
});
