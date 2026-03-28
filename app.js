/* === Telegram WebApp Init === */

const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

function haptic() {
    tg?.HapticFeedback?.impactOccurred('light');
}

function sendData(payload) {
    if (tg) {
        tg.sendData(JSON.stringify(payload));
    } else {
        alert('Откройте через Telegram для отправки данных');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str).replace(/[&<>"']/g, c => map[c]);
}

function nl2br(str) {
    if (!str) return '';
    return str.replace(/\n/g, '<br>');
}

/* === App State === */

const AppState = {
    currentPage: 'home',
    quiz: {
        type: null,
        currentStep: 0,
        steps: [],
        answers: {},
        prefill: null,
    },
    calculator: {
        type: null,
        pages: null,
        design: null,
        features: [],
        timeline: null,
        history: [1],
    },
    services: {
        level: 'categories',
        catId: null,
        subcatId: null,
    },
    portfolio: {
        filter: 'all',
    },
    favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
};

/* === Router === */

const Router = {
    navigate(pageId) {
        if (pageId === 'more') {
            toggleMoreMenu();
            return;
        }

        closeMoreMenu();

        document.querySelectorAll('.page').forEach(p => p.classList.remove('page--active'));
        const target = document.querySelector(`[data-page="${pageId}"]`);
        if (target) {
            target.classList.add('page--active');
        }

        AppState.currentPage = pageId;
        updateTabBar(pageId);
        window.scrollTo({ top: 0 });

        if (pageId === 'services' && AppState.services.level === 'categories') {
            ServicesPage.renderCategories();
        }
        if (pageId === 'calculator') {
            CalculatorPage.init();
        }
        if (pageId === 'quiz') {
            QuizPage.renderTypeChoice();
        }
        if (pageId === 'reviews') ReviewsPage.render();
        if (pageId === 'cases') CasesPage.render();
        if (pageId === 'faq') FaqPage.render();
        if (pageId === 'promos') PromosPage.render();
        if (pageId === 'portfolio') PortfolioPage.render();

        lucide.createIcons();
    },
};

function updateTabBar(pageId) {
    const mainTabs = ['home', 'services', 'portfolio', 'calculator'];
    document.querySelectorAll('.tab-bar__tab').forEach(tab => {
        tab.classList.remove('tab-bar__tab--active');
        if (tab.dataset.page === pageId) {
            tab.classList.add('tab-bar__tab--active');
        }
    });
    if (!mainTabs.includes(pageId) && pageId !== 'more') {
        document.querySelectorAll('.tab-bar__tab').forEach(t => t.classList.remove('tab-bar__tab--active'));
    }
}

/* === More Menu === */

function toggleMoreMenu() {
    const menu = document.getElementById('more-menu');
    menu.classList.toggle('more-menu--open');
}

function closeMoreMenu() {
    const menu = document.getElementById('more-menu');
    menu.classList.remove('more-menu--open');
}

/* === Detail Overlay === */

function openOverlay(html) {
    const overlay = document.getElementById('detail-overlay');
    const content = document.getElementById('detail-content');
    content.innerHTML = html;
    overlay.classList.add('overlay--open');
    lucide.createIcons();
}

function closeOverlay() {
    const overlay = document.getElementById('detail-overlay');
    overlay.classList.remove('overlay--open');
}

/* === Home Page === */

const HomePage = {
    init() {
        document.querySelectorAll('[data-navigate]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                const page = btn.dataset.navigate;
                if (btn.closest('.more-menu')) {
                    closeMoreMenu();
                }
                Router.navigate(page);
            });
        });

        document.getElementById('quickQuestionSend').addEventListener('click', () => {
            haptic();
            const input = document.getElementById('quickQuestionInput');
            const text = input.value.trim();
            if (!text) return;
            sendData({ action: 'quick_question', text });
            input.value = '';
        });

        document.getElementById('quickQuestionInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                document.getElementById('quickQuestionSend').click();
            }
        });

        document.getElementById('vipBtn').addEventListener('click', () => {
            haptic();
            sendData({ action: 'waitlist_join', month: 'april' });
        });
    },
};

/* === Services Page === */

const ServicesPage = {
    categoryDescriptions: {
        sites: 'Верстка, WordPress, кастомная разработка - сайт под вашу задачу с нуля и под ключ',
        shops: 'Каталог-магазин, WooCommerce, OpenCart или кастомное решение. Корзина, оплата, доставка, CRM.',
        support: 'Правки, баги, копирование, интеграции, оптимизация скорости, перенос.',
        design: 'Дизайн лендинга или редизайн существующего сайта. Макет в Figma, адаптив.',
    },

    renderCategories() {
        AppState.services.level = 'categories';
        AppState.services.catId = null;
        AppState.services.subcatId = null;

        const container = document.getElementById('services-content');
        const cats = DATA.services;

        container.innerHTML = cats.map(cat => `
            <button class="service-card" data-cat-id="${cat.id}">
                <span class="service-card__icon"><i data-lucide="${escapeHtml(cat.icon)}"></i></span>
                <span class="service-card__body">
                    <strong class="service-card__name">${escapeHtml(DATA.categoryNames[cat.id])}</strong>
                    <small class="service-card__desc">${escapeHtml(this.categoryDescriptions[cat.id] || '')}</small>
                </span>
                <span class="service-card__arrow"><i data-lucide="chevron-right"></i></span>
            </button>
        `).join('');

        container.querySelectorAll('[data-cat-id]').forEach(card => {
            card.addEventListener('click', () => {
                haptic();
                this.renderSubcategories(card.dataset.catId);
            });
        });

        lucide.createIcons();
    },

    renderSubcategories(catId) {
        AppState.services.level = 'subcategories';
        AppState.services.catId = catId;

        const cat = DATA.services.find(c => c.id === catId);
        if (!cat) return;

        const catName = DATA.categoryNames[catId];
        const container = document.getElementById('services-content');

        const breadcrumb = `
            <div class="breadcrumb">
                <button class="breadcrumb__link" data-back="categories">Услуги</button>
                <span class="breadcrumb__sep">/</span>
                <span class="breadcrumb__current">${escapeHtml(catName)}</span>
            </div>
        `;

        const cards = cat.subcategories.map(sub => `
            <button class="service-card" data-subcat-id="${sub.id}">
                <span class="service-card__body">
                    <strong class="service-card__name">${escapeHtml(DATA.subcategoryNames[sub.id] || sub.id)}</strong>
                    <small class="service-card__desc">${sub.tariffs.length} ${this.tariffsWord(sub.tariffs.length)}</small>
                </span>
                <span class="service-card__arrow"><i data-lucide="chevron-right"></i></span>
            </button>
        `).join('');

        container.innerHTML = breadcrumb + cards;

        container.querySelector('[data-back="categories"]').addEventListener('click', () => {
            haptic();
            this.renderCategories();
        });

        container.querySelectorAll('[data-subcat-id]').forEach(card => {
            card.addEventListener('click', () => {
                haptic();
                this.renderTariffs(catId, card.dataset.subcatId);
            });
        });

        lucide.createIcons();
    },

    renderTariffs(catId, subcatId) {
        AppState.services.level = 'tariffs';
        AppState.services.subcatId = subcatId;

        const cat = DATA.services.find(c => c.id === catId);
        if (!cat) return;
        const sub = cat.subcategories.find(s => s.id === subcatId);
        if (!sub) return;

        const catName = DATA.categoryNames[catId];
        const subName = DATA.subcategoryNames[subcatId] || subcatId;
        const container = document.getElementById('services-content');

        const breadcrumb = `
            <div class="breadcrumb">
                <button class="breadcrumb__link" data-back="categories">Услуги</button>
                <span class="breadcrumb__sep">/</span>
                <button class="breadcrumb__link" data-back="subcategories">${ escapeHtml(catName)}</button>
                <span class="breadcrumb__sep">/</span>
                <span class="breadcrumb__current">${escapeHtml(subName)}</span>
            </div>
        `;

        const cards = sub.tariffs.map(t => {
            const shortDesc = t.description.split('\n')[0];
            return `
                <button class="tariff-card" data-tariff-id="${t.id}">
                    <span class="tariff-card__badge">${escapeHtml(t.name)}</span>
                    <strong class="tariff-card__price">${escapeHtml(t.price)}</strong>
                    <small class="tariff-card__desc">${escapeHtml(shortDesc)}</small>
                </button>
            `;
        }).join('');

        container.innerHTML = breadcrumb + '<div class="tariff-grid">' + cards + '</div>';

        container.querySelector('[data-back="categories"]').addEventListener('click', () => {
            haptic();
            this.renderCategories();
        });

        container.querySelector('[data-back="subcategories"]').addEventListener('click', () => {
            haptic();
            this.renderSubcategories(catId);
        });

        container.querySelectorAll('[data-tariff-id]').forEach(card => {
            card.addEventListener('click', () => {
                haptic();
                const tariff = sub.tariffs.find(t => t.id === card.dataset.tariffId);
                if (tariff) this.showTariffDetail(catId, tariff);
            });
        });

        lucide.createIcons();
    },

    showTariffDetail(catId, tariff) {
        const catName = DATA.categoryNames[catId];

        openOverlay(`
            <div class="tariff-detail">
                <span class="tariff-detail__badge">${escapeHtml(tariff.name)}</span>
                <h2 class="tariff-detail__cat">${escapeHtml(catName)}</h2>
                <div class="tariff-detail__price">${escapeHtml(tariff.price)}</div>
                <div class="tariff-detail__desc">${nl2br(escapeHtml(tariff.description))}</div>
                <button class="btn btn--primary tariff-detail__cta" data-tariff-quiz="${tariff.id}">Обсудить этот вариант</button>
            </div>
        `);

        document.querySelector('[data-tariff-quiz]').addEventListener('click', () => {
            haptic();
            closeOverlay();

            const siteType = DATA.tariffPrefill.siteType[tariff.id];
            const budget = DATA.tariffPrefill.budget[tariff.id];

            AppState.quiz.prefill = {};
            if (siteType) AppState.quiz.prefill.site_type = siteType;
            if (budget) AppState.quiz.prefill.budget = budget;

            Router.navigate('quiz');
        });
    },

    tariffsWord(n) {
        if (n === 1) return 'тариф';
        if (n >= 2 && n <= 4) return 'тарифа';
        return 'тарифов';
    },
};

/* === Portfolio Page === */

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'];

const CATEGORY_LABELS = {
    sites: 'Сайты',
    shops: 'Магазины',
    design: 'Дизайн',
};

function isVideoUrl(url) {
    if (!url) return false;
    const lower = url.toLowerCase();
    return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function toggleFavorite(id) {
    const idx = AppState.favorites.indexOf(id);
    if (idx > -1) {
        AppState.favorites.splice(idx, 1);
    } else {
        AppState.favorites.push(id);
    }
    localStorage.setItem('favorites', JSON.stringify(AppState.favorites));
    PortfolioPage.updateFavoritesCount();
}

const PortfolioPage = {
    init() {
        this.render();
        this.initFilters();
        this.initEvents();
        this.updateFavoritesCount();
    },

    render(filter) {
        filter = filter || 'all';
        const items = DATA.portfolio.filter(
            p => filter === 'all' || p.category === filter
        );
        const feed = document.getElementById('portfolio-feed');
        const empty = document.getElementById('portfolioEmpty');

        if (!items.length) {
            feed.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }

        empty.style.display = 'none';
        feed.innerHTML = items.map(item => {
            const isFav = AppState.favorites.includes(item.id);
            const media = this.renderMedia(item);

            return `
                <article class="portfolio-item" data-pf-id="${escapeHtml(String(item.id || ''))}">
                    ${media}
                    <div class="portfolio-item__body">
                        <h3 class="portfolio-item__title">${escapeHtml(item.title)}</h3>
                        ${item.description ? `<p class="portfolio-item__desc">${nl2br(escapeHtml(item.description))}</p>` : ''}
                        <div class="portfolio-item__actions">
                            ${item.url ? `
                                <a class="portfolio-item__btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
                                    <i data-lucide="external-link"></i>
                                    Открыть сайт
                                </a>
                            ` : ''}
                            <button class="portfolio-item__btn portfolio-item__btn--fav ${isFav ? 'portfolio-item__btn--fav-active' : ''}" data-fav-id="${escapeHtml(String(item.id || ''))}">
                                <i data-lucide="heart"></i>
                                ${isFav ? 'В избранном' : 'В избранное'}
                            </button>
                        </div>
                        ${item.tags ? `<span class="portfolio-item__tag">${escapeHtml(CATEGORY_LABELS[item.tags] || item.tags)}</span>` : ''}
                    </div>
                </article>
            `;
        }).join('');

        lucide.createIcons();
    },

    renderMedia(item) {
        if (!item.image) return '';

        if (isVideoUrl(item.image)) {
            return `<video class="portfolio-item__media" src="${escapeHtml(item.image)}" autoplay muted loop playsinline></video>`;
        }

        return `<img class="portfolio-item__media" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" width="800" height="450" loading="lazy">`;
    },

    initEvents() {
        document.getElementById('portfolio-feed').addEventListener('click', e => {
            const favBtn = e.target.closest('[data-fav-id]');
            if (!favBtn) return;
            haptic();

            const id = Number(favBtn.dataset.favId) || favBtn.dataset.favId;
            toggleFavorite(id);

            const isFav = AppState.favorites.includes(id);
            favBtn.classList.toggle('portfolio-item__btn--fav-active', isFav);

            const textNode = favBtn.lastChild;
            if (textNode) textNode.textContent = isFav ? ' В избранном' : ' В избранное';

            const icon = favBtn.querySelector('[data-lucide]');
            if (icon) {
                icon.setAttribute('data-lucide', 'heart');
                lucide.createIcons({ nodes: [icon] });
            }
        });
    },

    updateFavoritesCount() {
        const badge = document.getElementById('favoritesCount');
        if (!badge) return;
        const count = AppState.favorites.length;
        badge.textContent = count ? `♥ ${count}` : '';
        badge.style.display = count ? 'inline-flex' : 'none';
    },

    initFilters() {
        document.getElementById('portfolioFilters').addEventListener('click', e => {
            const btn = e.target.closest('.filter-chips__btn');
            if (!btn) return;
            haptic();
            document.querySelectorAll('.filter-chips__btn').forEach(b => b.classList.remove('filter-chips__btn--active'));
            btn.classList.add('filter-chips__btn--active');
            AppState.portfolio.filter = btn.dataset.filter;
            this.render(btn.dataset.filter);
        });
    },
};

/* === Calculator Page === */

const CalculatorPage = {
    TOTAL_STEPS: 5,

    TYPE_LABELS: {
        landing: 'Лендинг',
        card: 'Сайт-визитка',
        corporate: 'Корпоративный сайт',
        shop: 'Интернет-магазин',
    },

    PAGES_LABELS: {
        '1_3': '1-3 страницы',
        '4_7': '4-7 страниц',
        '8_15': '8-15 страниц',
        '15plus': '15+ страниц',
    },

    DESIGN_LABELS: {
        ready: 'Есть макет',
        examples: 'Есть референсы',
        needed: 'Дизайн с нуля',
    },

    FEATURE_LABELS: {
        forms: 'Формы',
        crm: 'CRM',
        catalog: 'Каталог',
        payment: 'Оплата',
        i18n: 'Мультиязычность',
        seo: 'SEO',
    },

    TIMELINE_LABELS: {
        standard: 'Стандартные сроки',
        urgent: 'Срочно',
    },

    init() {
        const backBtn = document.getElementById('calcBackBtn');
        backBtn.style.display = AppState.calculator.history.length <= 1 ? 'none' : 'flex';

        const progress = document.getElementById('calcProgressBar');
        const currentStep = AppState.calculator.history[AppState.calculator.history.length - 1];
        if (typeof currentStep === 'number') {
            progress.style.width = (currentStep / this.TOTAL_STEPS * 100) + '%';
        }
    },

    goToStep(stepNum) {
        document.querySelectorAll('.calc-step').forEach(s => s.classList.remove('calc-step--active'));

        const target = document.querySelector(`[data-calc-step="${stepNum}"]`);
        if (target) target.classList.add('calc-step--active');

        const backBtn = document.getElementById('calcBackBtn');
        backBtn.style.display = stepNum === 1 ? 'none' : 'flex';

        if (stepNum !== 'result') {
            const progress = (stepNum / this.TOTAL_STEPS) * 100;
            document.getElementById('calcProgressBar').style.width = progress + '%';
        } else {
            document.getElementById('calcProgressBar').style.width = '100%';
            this.showResult();
        }

        if (typeof stepNum === 'number') {
            AppState.calculator.history.push(stepNum);
        }
    },

    goBack() {
        AppState.calculator.history.pop();
        const prev = AppState.calculator.history[AppState.calculator.history.length - 1] || 1;

        document.querySelectorAll('.calc-step').forEach(s => s.classList.remove('calc-step--active'));
        const target = document.querySelector(`[data-calc-step="${prev}"]`);
        if (target) target.classList.add('calc-step--active');

        const backBtn = document.getElementById('calcBackBtn');
        backBtn.style.display = prev === 1 ? 'none' : 'flex';

        const progress = (prev / this.TOTAL_STEPS) * 100;
        document.getElementById('calcProgressBar').style.width = progress + '%';
    },

    calculatePrice() {
        const calc = DATA.calculator;
        const st = AppState.calculator;

        let base = calc.basePrices[st.type] || 15000;
        base *= calc.pageMultipliers[st.pages] || 1.0;
        base *= calc.designMultipliers[st.design] || 1.0;

        const featuresCost = st.features.reduce(
            (sum, f) => sum + (calc.featureCosts[f] || 0), 0
        );
        let total = base + featuresCost;
        total *= calc.urgencyMultiplier[st.timeline] || 1.0;

        const min = Math.round(total * 0.9);
        const max = Math.round(total * 1.1);
        return { min, max };
    },

    formatPrice(amount) {
        const rub = amount.toLocaleString('ru-RU') + ' \u20BD';
        const usd = Math.round(amount / DATA.calculator.usdRate);
        return `${rub} (~$${usd})`;
    },

    showResult() {
        const { min, max } = this.calculatePrice();

        document.getElementById('calcResultPrice').textContent =
            this.formatPrice(min) + ' - ' + this.formatPrice(max);

        const st = AppState.calculator;
        const features = st.features.length
            ? st.features.map(f => this.FEATURE_LABELS[f]).join(', ')
            : 'не выбран';

        document.getElementById('calcResultSummary').innerHTML =
            `<span>Тип:</span> ${this.TYPE_LABELS[st.type] || '-'}<br>` +
            `<span>Страниц:</span> ${this.PAGES_LABELS[st.pages] || '-'}<br>` +
            `<span>Дизайн:</span> ${this.DESIGN_LABELS[st.design] || '-'}<br>` +
            `<span>Функционал:</span> ${features}<br>` +
            `<span>Сроки:</span> ${this.TIMELINE_LABELS[st.timeline] || '-'}`;
    },

    reset() {
        AppState.calculator = {
            type: null,
            pages: null,
            design: null,
            features: [],
            timeline: null,
            history: [1],
        };

        document.querySelectorAll('.calc-step .option--selected, .calc-step .chip--selected').forEach(el => {
            el.classList.remove('option--selected', 'chip--selected');
        });

        this.goToStep(1);
    },

    initEvents() {
        document.querySelectorAll('.option[data-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                AppState.calculator.type = btn.dataset.type;
                btn.closest('.calc-step__options').querySelectorAll('.option').forEach(o => o.classList.remove('option--selected'));
                btn.classList.add('option--selected');
                setTimeout(() => this.goToStep(Number(btn.dataset.next)), 200);
            });
        });

        document.querySelectorAll('.option[data-pages]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                AppState.calculator.pages = btn.dataset.pages;
                btn.closest('.calc-step__options').querySelectorAll('.option').forEach(o => o.classList.remove('option--selected'));
                btn.classList.add('option--selected');
                setTimeout(() => this.goToStep(Number(btn.dataset.next)), 200);
            });
        });

        document.querySelectorAll('.option[data-design]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                AppState.calculator.design = btn.dataset.design;
                btn.closest('.calc-step__options').querySelectorAll('.option').forEach(o => o.classList.remove('option--selected'));
                btn.classList.add('option--selected');
                setTimeout(() => this.goToStep(Number(btn.dataset.next)), 200);
            });
        });

        document.querySelectorAll('.option[data-timeline]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                AppState.calculator.timeline = btn.dataset.timeline;
                btn.closest('.calc-step__options').querySelectorAll('.option').forEach(o => o.classList.remove('option--selected'));
                btn.classList.add('option--selected');
                setTimeout(() => this.goToStep(btn.dataset.next), 200);
            });
        });

        document.querySelectorAll('.chip[data-feature]').forEach(chip => {
            chip.addEventListener('click', () => {
                haptic();
                const feature = chip.dataset.feature;
                const idx = AppState.calculator.features.indexOf(feature);
                if (idx > -1) {
                    AppState.calculator.features.splice(idx, 1);
                    chip.classList.remove('chip--selected');
                } else {
                    AppState.calculator.features.push(feature);
                    chip.classList.add('chip--selected');
                }
            });
        });

        const nextBtn = document.querySelector('.calc-step__next[data-next]');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                haptic();
                this.goToStep(Number(nextBtn.dataset.next));
            });
        }

        document.getElementById('calcBackBtn').addEventListener('click', () => {
            haptic();
            this.goBack();
        });

        document.getElementById('calcRestartBtn').addEventListener('click', () => {
            haptic();
            this.reset();
        });

        document.getElementById('calcSubmitBtn').addEventListener('click', () => {
            haptic();
            const st = AppState.calculator;
            const { min, max } = this.calculatePrice();
            sendData({
                action: 'calculator_result',
                type: st.type,
                pages: st.pages,
                design: st.design,
                features: st.features,
                timeline: st.timeline,
                price_min: min,
                price_max: max,
            });
        });
    },
};

/* === Reviews Page === */

const ReviewsPage = {
    render() {
        const list = document.getElementById('reviews-list');
        const empty = document.getElementById('reviewsEmpty');

        if (!DATA.reviews.length) {
            list.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = DATA.reviews.map(r => `
            <div class="review-card">
                <div class="review-card__header">
                    <strong class="review-card__name">${escapeHtml(r.name || '')}</strong>
                    ${r.company ? `<span class="review-card__company">${escapeHtml(r.company)}</span>` : ''}
                </div>
                <p class="review-card__text">${nl2br(escapeHtml(r.text || ''))}</p>
            </div>
        `).join('');
    },
};

/* === Cases Page === */

const CasesPage = {
    render() {
        const list = document.getElementById('cases-list');
        const empty = document.getElementById('casesEmpty');

        if (!DATA.cases.length) {
            list.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = DATA.cases.map(c => `
            <div class="case-card">
                <h3 class="case-card__title">${escapeHtml(c.title || '')}</h3>
                ${c.task ? `<div class="case-card__section"><strong>Задача:</strong><p>${nl2br(escapeHtml(c.task))}</p></div>` : ''}
                ${c.solution ? `<div class="case-card__section"><strong>Решение:</strong><p>${nl2br(escapeHtml(c.solution))}</p></div>` : ''}
                ${c.result ? `<div class="case-card__section"><strong>Результат:</strong><p>${nl2br(escapeHtml(c.result))}</p></div>` : ''}
                ${c.url ? `<a class="btn btn--secondary case-card__link" href="${escapeHtml(c.url)}" target="_blank">Открыть сайт</a>` : ''}
            </div>
        `).join('');
    },
};

/* === FAQ Page === */

const FaqPage = {
    render() {
        const list = document.getElementById('faq-list');
        const empty = document.getElementById('faqEmpty');

        if (!DATA.faq.length) {
            list.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = `<div class="accordion">${DATA.faq.map((item, i) => `
            <div class="accordion__item" data-faq-index="${i}">
                <button class="accordion__header">
                    <span class="accordion__question">${escapeHtml(item.question || '')}</span>
                    <i data-lucide="chevron-down"></i>
                </button>
                <div class="accordion__body">
                    <div class="accordion__answer">${nl2br(escapeHtml(item.answer || ''))}</div>
                </div>
            </div>
        `).join('')}</div>`;

        list.addEventListener('click', e => {
            const header = e.target.closest('.accordion__header');
            if (!header) return;
            haptic();
            const item = header.closest('.accordion__item');
            item.classList.toggle('accordion__item--active');
        });

        lucide.createIcons();
    },
};

/* === Quiz Page === */

const QuizPage = {
    DESIGN_IRRELEVANT_TYPES: DATA.quiz.designIrrelevantTypes,

    renderTypeChoice() {
        const container = document.getElementById('quiz-content');

        container.innerHTML = `
            <header class="page__header">
                <h1 class="page__title">Обсудить проект</h1>
            </header>
            <p class="quiz-intro">Выберите формат - отвечу в ближайшее время</p>
            <div class="quiz-types">
                <button class="quiz-type-card" data-quiz-type="quick">
                    <i data-lucide="zap"></i>
                    <strong>Быстрый опрос</strong>
                    <small>4 вопроса - 1 минута</small>
                </button>
                <button class="quiz-type-card" data-quiz-type="detailed">
                    <i data-lucide="clipboard-list"></i>
                    <strong>Подробный опрос</strong>
                    <small>7 вопросов - 3 минуты</small>
                </button>
            </div>
        `;

        container.querySelectorAll('[data-quiz-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                this.startQuiz(btn.dataset.quizType);
            });
        });

        lucide.createIcons();
    },

    startQuiz(type) {
        AppState.quiz.type = type;
        AppState.quiz.answers = {};
        AppState.quiz.currentStep = 0;

        const prefill = AppState.quiz.prefill || {};

        if (type === 'quick') {
            AppState.quiz.steps = ['site_type', 'has_design', 'budget', 'contact'];
        } else {
            AppState.quiz.steps = [
                'site_type', 'about', 'features', 'has_design',
                'examples', 'budget_timeline', 'contact'
            ];
        }

        if (prefill.site_type) {
            AppState.quiz.answers.site_type = prefill.site_type;
            const idx = AppState.quiz.steps.indexOf('site_type');
            if (idx > -1) AppState.quiz.steps.splice(idx, 1);

            if (this.DESIGN_IRRELEVANT_TYPES.includes(prefill.site_type)) {
                const dIdx = AppState.quiz.steps.indexOf('has_design');
                if (dIdx > -1) AppState.quiz.steps.splice(dIdx, 1);
            }
        }

        if (prefill.budget) {
            AppState.quiz.answers.budget = prefill.budget;
            const idx = AppState.quiz.steps.indexOf('budget');
            if (idx > -1) AppState.quiz.steps.splice(idx, 1);
        }

        this.renderStep();
    },

    renderStep() {
        const step = AppState.quiz.steps[AppState.quiz.currentStep];
        if (!step) {
            this.submit();
            return;
        }

        const container = document.getElementById('quiz-content');
        const total = AppState.quiz.steps.length;
        const current = AppState.quiz.currentStep + 1;

        const dots = AppState.quiz.steps.map((_, i) =>
            `<span class="quiz-dot ${i <= AppState.quiz.currentStep ? 'quiz-dot--active' : ''}"></span>`
        ).join('');

        let backBtn = '';
        if (AppState.quiz.currentStep > 0) {
            backBtn = `<button class="quiz-back" data-quiz-back><i data-lucide="arrow-left"></i> Назад</button>`;
        }

        let content = '';

        switch (step) {
            case 'site_type':
                content = this.renderOptions(
                    'Какой сайт нужен?',
                    DATA.quiz.siteTypes.map(t => ({
                        value: t.value,
                        label: t.label,
                        icon: t.icon,
                    })),
                    'site_type'
                );
                break;

            case 'has_design':
                content = this.renderOptions(
                    'Есть дизайн-макет?',
                    DATA.quiz.designOptions.map(d => ({
                        value: d.value,
                        label: d.label,
                    })),
                    'has_design'
                );
                break;

            case 'budget':
                content = this.renderOptions(
                    'Какой бюджет планируете?',
                    DATA.quiz.budgetOptions.map(b => ({
                        value: b.value,
                        label: b.label,
                    })),
                    'budget'
                );
                break;

            case 'contact':
                content = this.renderTextStep(
                    'Как с вами связаться?',
                    'Имя, Telegram или телефон',
                    'contact'
                );
                break;

            case 'about':
                content = this.renderTextStep(
                    'Расскажите о проекте',
                    'Чем занимается компания, для чего сайт...',
                    'about'
                );
                break;

            case 'features':
                content = this.renderMultiSelect(
                    'Какой функционал нужен?',
                    DATA.quiz.featureOptions.map(f => ({
                        value: f.value,
                        label: f.label,
                    })),
                    'features'
                );
                break;

            case 'examples':
                content = this.renderTextStep(
                    'Есть примеры сайтов, которые нравятся?',
                    'Ссылки или описание (можно пропустить)',
                    'examples',
                    true
                );
                break;

            case 'budget_timeline':
                content = this.renderTextStep(
                    'Бюджет и сроки',
                    'Примерный бюджет и когда нужен сайт',
                    'budget_timeline'
                );
                break;
        }

        container.innerHTML = `
            <div class="quiz-progress">${dots}</div>
            ${backBtn}
            <div class="quiz-step">
                <span class="quiz-step__counter">${current} / ${total}</span>
                ${content}
            </div>
        `;

        if (container.querySelector('[data-quiz-back]')) {
            container.querySelector('[data-quiz-back]').addEventListener('click', () => {
                haptic();
                this.prevStep();
            });
        }

        lucide.createIcons();
    },

    renderOptions(title, options, key) {
        const items = options.map(opt => `
            <button class="quiz-option" data-quiz-value="${escapeHtml(opt.value)}">
                ${opt.icon ? `<i data-lucide="${escapeHtml(opt.icon)}"></i>` : ''}
                <span>${escapeHtml(opt.label)}</span>
            </button>
        `).join('');

        setTimeout(() => {
            document.querySelectorAll('.quiz-option[data-quiz-value]').forEach(btn => {
                btn.addEventListener('click', () => {
                    haptic();
                    AppState.quiz.answers[key] = btn.dataset.quizValue;

                    if (key === 'site_type' && this.DESIGN_IRRELEVANT_TYPES.includes(btn.dataset.quizValue)) {
                        const dIdx = AppState.quiz.steps.indexOf('has_design');
                        if (dIdx > -1) AppState.quiz.steps.splice(dIdx, 1);
                    }

                    btn.closest('.quiz-options').querySelectorAll('.quiz-option').forEach(o => o.classList.remove('quiz-option--selected'));
                    btn.classList.add('quiz-option--selected');
                    setTimeout(() => this.nextStep(), 250);
                });
            });
        }, 0);

        return `<h2 class="quiz-step__title">${escapeHtml(title)}</h2><div class="quiz-options">${items}</div>`;
    },

    renderMultiSelect(title, options, key) {
        const items = options.map(opt => `
            <button class="chip" data-quiz-chip="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</button>
        `).join('');

        setTimeout(() => {
            const selected = [];

            document.querySelectorAll('[data-quiz-chip]').forEach(chip => {
                chip.addEventListener('click', () => {
                    haptic();
                    const val = chip.dataset.quizChip;
                    const idx = selected.indexOf(val);
                    if (idx > -1) {
                        selected.splice(idx, 1);
                        chip.classList.remove('chip--selected');
                    } else {
                        selected.push(val);
                        chip.classList.add('chip--selected');
                    }
                    AppState.quiz.answers[key] = [...selected];
                });
            });

            document.querySelector('[data-quiz-next]')?.addEventListener('click', () => {
                haptic();
                this.nextStep();
            });
        }, 0);

        return `
            <h2 class="quiz-step__title">${escapeHtml(title)}</h2>
            <div class="quiz-chips">${items}</div>
            <button class="btn btn--primary quiz-next" data-quiz-next>Далее</button>
        `;
    },

    renderTextStep(title, placeholder, key, skippable) {
        setTimeout(() => {
            const input = document.querySelector('[data-quiz-text]');
            const sendBtn = document.querySelector('[data-quiz-send]');
            const skipBtn = document.querySelector('[data-quiz-skip]');

            sendBtn?.addEventListener('click', () => {
                haptic();
                const val = input.value.trim();
                if (!val && !skippable) return;
                AppState.quiz.answers[key] = val;
                this.nextStep();
            });

            input?.addEventListener('keydown', e => {
                if (e.key === 'Enter') sendBtn?.click();
            });

            skipBtn?.addEventListener('click', () => {
                haptic();
                AppState.quiz.answers[key] = '';
                this.nextStep();
            });
        }, 0);

        return `
            <h2 class="quiz-step__title">${escapeHtml(title)}</h2>
            <div class="quiz-text-field">
                <input class="input" type="text" data-quiz-text placeholder="${escapeHtml(placeholder)}">
            </div>
            <button class="btn btn--primary quiz-next" data-quiz-send>Далее</button>
            ${skippable ? '<button class="btn btn--secondary quiz-skip" data-quiz-skip>Пропустить</button>' : ''}
        `;
    },

    nextStep() {
        AppState.quiz.currentStep++;
        if (AppState.quiz.currentStep >= AppState.quiz.steps.length) {
            this.submit();
        } else {
            this.renderStep();
        }
    },

    prevStep() {
        if (AppState.quiz.currentStep > 0) {
            AppState.quiz.currentStep--;
            this.renderStep();
        } else {
            this.renderTypeChoice();
        }
    },

    submit() {
        const container = document.getElementById('quiz-content');
        container.innerHTML = `
            <div class="quiz-done">
                <div class="quiz-done__icon"><i data-lucide="check-circle"></i></div>
                <h2 class="quiz-done__title">Заявка отправлена</h2>
                <p class="quiz-done__text">Свяжусь с вами в ближайшее время</p>
                <button class="btn btn--secondary quiz-done__home" data-quiz-home>На главную</button>
            </div>
        `;

        const payload = {
            action: 'quiz_submit',
            quiz_type: AppState.quiz.type,
            ...AppState.quiz.answers,
        };

        if (AppState.favorites.length) {
            const favItems = DATA.portfolio.filter(p => AppState.favorites.includes(p.id));
            payload.favorites = favItems.map(p => p.title).join(', ');
        }

        sendData(payload);

        AppState.quiz.prefill = null;

        container.querySelector('[data-quiz-home]')?.addEventListener('click', () => {
            haptic();
            Router.navigate('home');
        });

        lucide.createIcons();
    },
};

/* === Audit Page === */

const AuditPage = {
    init() {
        document.getElementById('auditSubmitBtn').addEventListener('click', () => {
            haptic();
            const input = document.getElementById('auditUrlInput');
            const url = input.value.trim();

            if (!url || !url.includes('.')) {
                input.classList.add('input--error');
                setTimeout(() => input.classList.remove('input--error'), 1500);
                return;
            }

            sendData({ action: 'audit_request', url });

            input.value = '';
            const note = document.querySelector('.audit__note');
            if (note) {
                note.textContent = 'Запрос отправлен! Результат придет в этот чат.';
                note.classList.add('audit__note--success');
            }
        });
    },
};

/* === Contact Page === */

const ContactPage = {
    init() {
        const link = document.getElementById('contactLink');
        if (link && DATA.contact.username) {
            link.href = `https://t.me/${DATA.contact.username}`;
        }
    },
};

/* === Promos Page === */

const PromosPage = {
    timers: [],

    render() {
        const list = document.getElementById('promos-list');
        const empty = document.getElementById('promosEmpty');

        this.timers.forEach(t => clearInterval(t));
        this.timers = [];

        if (!DATA.promos.length) {
            list.innerHTML = '';
            empty.style.display = 'flex';
            return;
        }

        empty.style.display = 'none';
        list.innerHTML = DATA.promos.map((promo, i) => `
            <div class="promo-card">
                ${promo.discount ? `<span class="promo-card__badge">${escapeHtml(promo.discount)}</span>` : ''}
                <h3 class="promo-card__title">${escapeHtml(promo.title || '')}</h3>
                <p class="promo-card__text">${nl2br(escapeHtml(promo.text || ''))}</p>
                ${promo.code ? `
                    <div class="promo-card__code">
                        <span>${escapeHtml(promo.code)}</span>
                        <button class="promo-card__copy" data-copy="${escapeHtml(promo.code)}" aria-label="Скопировать">
                            <i data-lucide="copy"></i>
                        </button>
                    </div>
                ` : ''}
                ${promo.deadline ? `<div class="promo-card__timer" data-promo-timer="${i}"></div>` : ''}
            </div>
        `).join('');

        list.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                navigator.clipboard?.writeText(btn.dataset.copy);
                btn.innerHTML = '<i data-lucide="check"></i>';
                lucide.createIcons();
                setTimeout(() => {
                    btn.innerHTML = '<i data-lucide="copy"></i>';
                    lucide.createIcons();
                }, 2000);
            });
        });

        DATA.promos.forEach((promo, i) => {
            if (!promo.deadline) return;
            const timerEl = list.querySelector(`[data-promo-timer="${i}"]`);
            if (!timerEl) return;

            const update = () => {
                const now = Date.now();
                const end = new Date(promo.deadline).getTime();
                const diff = end - now;

                if (diff <= 0) {
                    timerEl.textContent = 'Акция завершена';
                    return;
                }

                const days = Math.floor(diff / 86400000);
                const hours = Math.floor((diff % 86400000) / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);

                const parts = [];
                if (days > 0) parts.push(`${days}д`);
                parts.push(`${hours}ч`);
                parts.push(`${minutes}мин`);

                timerEl.textContent = 'Осталось: ' + parts.join(' ');
            };

            update();
            this.timers.push(setInterval(update, 60000));
        });

        lucide.createIcons();
    },
};

/* === Tab Bar === */

function initTabBar() {
    document.getElementById('tab-bar').addEventListener('click', e => {
        const tab = e.target.closest('.tab-bar__tab');
        if (!tab) return;
        haptic();

        const page = tab.dataset.page;
        if (page === 'more') {
            toggleMoreMenu();
            return;
        }

        Router.navigate(page);
    });
}

/* === More Menu Events === */

function initMoreMenu() {
    const menu = document.getElementById('more-menu');

    menu.querySelector('.more-menu__backdrop').addEventListener('click', () => {
        closeMoreMenu();
    });
}

/* === Overlay Events === */

function initOverlay() {
    document.getElementById('overlayClose').addEventListener('click', () => {
        haptic();
        closeOverlay();
    });
}

/* === Load Live Data from API === */

/* API URL - relative when on same server, absolute for GitHub Pages */
const API_URL = (window.location.hostname === 'bot.yanksweb.ru' || window.location.hostname === '94.198.217.56')
    ? ''
    : 'https://bot.yanksweb.ru';

async function loadLiveData() {
    const endpoints = ['portfolio', 'reviews', 'cases', 'faq', 'promos'];

    for (const key of endpoints) {
        try {
            const res = await fetch(`${API_URL}/api/${key}`, {
                headers: { 'X-App-Key': 'yanksweb-miniapp' }
            });
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.items) {
                    if (key === 'portfolio') {
                        DATA.portfolio = json.items.map(i => ({
                            id: i.id,
                            category: i.category || 'sites',
                            title: i.title_ru || i.title || '',
                            description: i.description_ru || i.description || '',
                            image: i.media_file_id || i.media_url || '',
                            url: i.url || '',
                            tags: i.category || '',
                        }));
                    } else if (key === 'reviews') {
                        DATA.reviews = json.items.map(i => ({
                            id: i.id,
                            name: i.client_name || '',
                            company: i.company || '',
                            text: i.text_ru || '',
                            image: i.media_file_id || '',
                        }));
                    } else if (key === 'cases') {
                        DATA.cases = json.items.map(i => ({
                            id: i.id,
                            title: i.title_ru || '',
                            task: i.task_ru || '',
                            solution: i.solution_ru || '',
                            result: i.result_ru || '',
                            url: i.url || '',
                            image: i.before_media_id || '',
                        }));
                    } else if (key === 'faq') {
                        DATA.faq = json.items.map(i => ({
                            id: i.id,
                            question: i.question_ru || '',
                            answer: i.answer_ru || '',
                        }));
                    } else if (key === 'promos') {
                        DATA.promos = json.items.filter(i => i.is_active).map(i => ({
                            id: i.id,
                            title: i.title_ru || '',
                            text: i.text_ru || '',
                            code: i.promo_code || '',
                            discount: i.discount_percent ? `-${i.discount_percent}%` : '',
                            deadline: i.deadline || '',
                        }));
                    }
                }
            }
        } catch (e) {
            console.log(`Failed to load ${key}, using static data`);
        }
    }
}

/* === Init === */

document.addEventListener('DOMContentLoaded', async () => {
    initTabBar();
    initMoreMenu();
    initOverlay();
    HomePage.init();
    CalculatorPage.initEvents();
    AuditPage.init();
    ContactPage.init();

    await loadLiveData();

    PortfolioPage.init();
    ReviewsPage.render();
    CasesPage.render();
    FaqPage.render();
    PromosPage.render();
    ServicesPage.renderCategories();

    Router.navigate('home');
});
