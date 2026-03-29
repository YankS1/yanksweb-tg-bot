/* === Telegram WebApp Init === */

const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
    tg.BackButton?.onClick(() => {
        if (AppState.currentPage === 'services') {
            if (AppState.services.level === 'tariffs') {
                ServicesPage.renderSubcategories(AppState.services.catId);
                return;
            }
            if (AppState.services.level === 'subcategories') {
                ServicesPage.renderCategories();
                return;
            }
        }
        const prev = Router.history.pop() || 'home';
        Router._isBack = true;
        Router.navigate(prev);
        Router._isBack = false;
    });
}

function haptic() {
    tg?.HapticFeedback?.impactOccurred('light');
}

function getTgUser() {
    const user = tg?.initDataUnsafe?.user;
    if (!user) return {};
    return {
        telegram_id: user.id,
        username: user.username || '',
        first_name: user.first_name || '',
    };
}

async function submitToApi(endpoint, payload) {
    const userInfo = getTgUser();
    try {
        const res = await fetch(`${API_URL}/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...userInfo, ...payload, initData: tg?.initData || '' }),
        });
        return res.ok;
    } catch {
        return false;
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

function formatDescription(str) {
    if (!str) return '';
    const escaped = escapeHtml(str);
    const lines = escaped.split('\n').filter(l => l.trim());
    let html = '';
    let inList = false;

    for (const line of lines) {
        const clean = line.replace(/^[\u2705\u2714\u2611\u2022\u25CF\u25E6\u25AA\u25AB]\s*/u, '').trim();
        const isListItem = /^[\u2705\u2714\u2611\u2022\u25CF\u25E6\u25AA\u25AB]/u.test(line.trim());

        if (isListItem) {
            if (!inList) {
                html += '<ul class="feature-list">';
                inList = true;
            }
            html += `<li><span class="feature-list__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span>${clean}</span></li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<p>${line}</p>`;
        }
    }
    if (inList) html += '</ul>';
    return html;
}

function getLiveTexts() {
    return window.MINIAPP_TEXTS || DATA.liveTexts || {};
}

function plainText(str) {
    if (!str) return '';
    return String(str)
        .replace(/<tg-emoji[^>]*>(.*?)<\/tg-emoji>/gi, '$1')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
}

function stripLeadingDecorators(str) {
    return String(str || '').replace(/^[^A-Za-zА-Яа-я0-9]+/u, '').trim();
}

function text(key, fallback = '') {
    const value = getLiveTexts()[key];
    return value ? plainText(value) : fallback;
}

function labelText(key, fallback = '') {
    const liveValue = text(key, '');
    const normalized = stripLeadingDecorators(liveValue);
    if (normalized) return normalized;
    const fallbackNormalized = stripLeadingDecorators(fallback);
    return fallbackNormalized || fallback;
}

function interpolateText(template, values = {}) {
    let result = String(template || '');
    for (const [key, value] of Object.entries(values)) {
        result = result.replaceAll(`{${key}}`, String(value ?? ''));
    }
    return result;
}

function formatCompactRub(amount) {
    return `${Math.round(amount || 0).toLocaleString('ru-RU')} ₽`;
}

function portfolioCategoryLabel(category) {
    const mapping = {
        all: ['portfolio.cat_all', 'Все'],
        sites: ['portfolio.cat_sites', 'Сайты'],
        shops: ['portfolio.cat_shops', 'Магазины'],
        design: ['portfolio.cat_design', 'Дизайн'],
    };
    const [key, fallback] = mapping[category] || [];
    return key ? labelText(key, fallback) : category;
}

function applyStaticTexts() {
    const setText = (selector, value) => {
        const el = document.querySelector(selector);
        if (el && value) el.textContent = value;
    };

    const setPlaceholder = (selector, value) => {
        const el = document.querySelector(selector);
        if (el && value) el.setAttribute('placeholder', value);
    };

    setText('.hero__tagline', text('home.tagline', 'Сайты под ключ - от дизайна до запуска'));

    const homeSectionTitles = document.querySelectorAll('[data-page="home"] .section-title');
    if (homeSectionTitles[0]) homeSectionTitles[0].textContent = text('home.quick_actions_title', 'Быстрые действия');
    if (homeSectionTitles[1]) homeSectionTitles[1].textContent = text('home.quick_question_title', 'Быстрый вопрос');
    if (homeSectionTitles[2]) homeSectionTitles[2].textContent = text('home.booking_title', 'Бронирование');

    setText('[data-page="services"] .page__title', text('services.title', 'Услуги и цены'));
    setText('[data-page="portfolio"] .page__title', text('portfolio.title', 'Мои работы'));
    setText('[data-page="reviews"] .page__title', text('reviews.title', 'Отзывы клиентов'));
    setText('[data-page="cases"] .page__title', text('reviews.cases_title', 'Кейсы'));
    setText('[data-page="faq"] .page__title', text('faq.title', 'Частые вопросы'));
    setText('[data-page="audit"] .page__title', text('audit.title', 'Экспресс-аудит сайта'));
    setText('[data-page="contact"] .page__title', labelText('contact.title', 'Написать напрямую'));
    setText('[data-page="promos"] .page__title', text('promo.title', 'Акции'));

    setText('[data-navigate="services"] .quick-actions__label', labelText('menu.services', 'Услуги'));
    setText('[data-navigate="calculator"] .quick-actions__label', labelText('menu.calculator', 'Расчет'));
    setText('[data-navigate="quiz"] .quick-actions__label', labelText('menu.request', 'Обсудить проект'));
    setText('[data-navigate="audit"] .quick-actions__label', labelText('audit.title', 'Аудит сайта'));

    setPlaceholder('#quickQuestionInput', text('quick_question.prompt', 'Напишите ваш вопрос...'));
    setText('#bookingBanner .vip-banner__title', text('waitlist.webapp_banner_title', 'Проект не сейчас, а через неделю-месяц-два?'));
    setText('#bookingBanner .vip-banner__text', text('waitlist.webapp_banner_text', 'Забронируйте дату старта - так я точно смогу выделить время под ваш проект. Без брони свободного окна может не оказаться'));
    setText('#bookingOpenBtn', text('waitlist.webapp_open', 'Забронировать дату'));
    setText('#bookingForm .booking-form__title', text('waitlist.webapp_form_title', 'Бронирование даты'));
    setText('#bookingForm .booking-form__subtitle', text('waitlist.webapp_form_subtitle', 'Выберите дату, когда хотите начать обсуждение и работу. Это не дедлайн - просто ориентир, чтобы я зарезервировал время'));
    setText('#bookingDateHint', text('waitlist.webapp_date_hint', 'Нажмите, чтобы выбрать дату'));
    setPlaceholder('#bookingName', text('waitlist.webapp_name_placeholder', 'Как к вам обращаться'));
    setPlaceholder('#bookingTask', text('waitlist.webapp_task_placeholder', 'Например: интернет-магазин одежды'));
    setText('#bookingSubmitBtn', text('waitlist.webapp_submit', 'Отправить бронь'));
    const bookingLabels = document.querySelectorAll('#bookingForm .booking-form__label');
    if (bookingLabels[0]) bookingLabels[0].textContent = text('waitlist.webapp_date_label', 'Когда планируете начать?');
    if (bookingLabels[1]) bookingLabels[1].textContent = text('waitlist.webapp_name_label', 'Ваше имя');
    if (bookingLabels[2]) bookingLabels[2].textContent = text('waitlist.webapp_task_label', 'Кратко о задаче');

    setText('#portfolioFilters [data-filter="all"]', labelText('portfolio.cat_all', 'Все'));
    setText('#portfolioFilters [data-filter="sites"]', labelText('portfolio.cat_sites', 'Сайты'));
    setText('#portfolioFilters [data-filter="shops"]', labelText('portfolio.cat_shops', 'Магазины'));
    setText('#portfolioFilters [data-filter="design"]', labelText('portfolio.cat_design', 'Дизайн'));
    setText('#portfolioEmpty p', text('portfolio.empty', 'Работы скоро появятся'));
    setText('#reviewsEmpty p', text('reviews.empty', 'Отзывы скоро появятся'));
    setText('#casesEmpty p', text('reviews.cases_empty', 'Кейсы скоро появятся'));
    setText('#faqEmpty p', text('faq.empty', 'Раздел в разработке'));
    setText('#promosEmpty p', text('promo.empty', 'Сейчас акций нет, но они скоро появятся'));

    setText('[data-page="audit"] .audit__desc', text('audit.prompt', 'Укажите адрес вашего сайта, и я проведу быстрый анализ: скорость загрузки, SEO, мобильная версия, основные ошибки.'));
    setPlaceholder('#auditUrlInput', text('audit.enter_url', 'https://example.com'));
    setText('#auditSubmitBtn', text('audit.webapp_submit', 'Проверить'));
    setText('.audit__note', text('audit.webapp_ready_note', 'Результат придет в течение 5-10 минут в этот чат'));
    setText('.contact-card__name', text('contact.name', 'Даниил'));
    setText('#contactLink', labelText('contact.write', 'Написать в Telegram'));
    setText('.contact-card__desc', text('contact.text', DATA.contact.description || ''));

    setText('#tab-bar [data-page="home"] span', text('menu.home', 'Главная'));
    setText('#tab-bar [data-page="services"] span', labelText('menu.services', 'Услуги'));
    setText('#tab-bar [data-page="portfolio"] span', labelText('menu.portfolio', 'Работы'));
    setText('#tab-bar [data-page="calculator"] span', labelText('menu.calculator', 'Расчет'));

    setText('#more-menu [data-navigate="reviews"] span:last-child', labelText('menu.reviews', 'Отзывы'));
    setText('#more-menu [data-navigate="cases"] span:last-child', labelText('reviews.cases_title', 'Кейсы'));
    setText('#more-menu [data-navigate="faq"] span:last-child', labelText('menu.faq', 'FAQ'));
    setText('#more-menu [data-navigate="audit"] span:last-child', labelText('audit.title', 'Аудит сайта'));
    setText('#more-menu [data-navigate="contact"] span:last-child', labelText('menu.contact', 'Контакт'));
    setText('#more-menu [data-navigate="promos"] span:last-child', labelText('menu.promos', 'Акции'));

    if (typeof CalculatorPage !== 'undefined' && CalculatorPage?.syncTexts) {
        CalculatorPage.syncTexts();
    }
}

/* === Animate In === */

function animateIn(container) {
    const items = container.querySelectorAll('.animate-in');
    items.forEach((el, i) => {
        el.style.setProperty('--delay', `${i * 50}ms`);
    });
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
    history: [],

    navigate(pageId) {
        if (pageId === 'more') {
            toggleMoreMenu();
            return;
        }

        closeMoreMenu();

        if (AppState.currentPage && AppState.currentPage !== pageId && !this._isBack) {
            this.history.push(AppState.currentPage);
        }

        document.querySelectorAll('.page').forEach(p => p.classList.remove('page--active'));
        const target = document.querySelector(`[data-page="${pageId}"]`);
        if (target) {
            target.classList.add('page--active');
        }

        AppState.currentPage = pageId;
        updateTabBar(pageId);

        if (tg?.BackButton) {
            if (pageId === 'home') {
                tg.BackButton.hide();
            } else {
                tg.BackButton.show();
            }
        }
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

        if (target) animateIn(target);
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
            submitToApi('quick-question', { text });
            input.value = '';
        });

        document.getElementById('quickQuestionInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                document.getElementById('quickQuestionSend').click();
            }
        });

        const banner = document.getElementById('bookingBanner');
        const form = document.getElementById('bookingForm');
        const dateInput = document.getElementById('bookingDate');
        const submitBtn = document.getElementById('bookingSubmitBtn');
        const nameInput = document.getElementById('bookingName');
        const taskInput = document.getElementById('bookingTask');

        const today = new Date();
        const minDate = today.toISOString().split('T')[0];
        const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
        dateInput.min = minDate;
        dateInput.max = maxDate;

        document.getElementById('bookingOpenBtn').addEventListener('click', () => {
            haptic();
            banner.style.display = 'none';
            form.style.display = 'block';
        });

        const tgUser = tg?.initDataUnsafe?.user;
        if (tgUser?.first_name) {
            nameInput.value = tgUser.first_name;
        }

        const dateHint = document.getElementById('bookingDateHint');

        function checkFormReady() {
            submitBtn.disabled = !(dateInput.value && nameInput.value.trim());
            if (dateInput.value) {
                dateHint.classList.add('booking-form__date-hint--hidden');
            } else {
                dateHint.classList.remove('booking-form__date-hint--hidden');
            }
        }
        nameInput.addEventListener('input', checkFormReady);
        dateInput.addEventListener('input', checkFormReady);
        dateInput.addEventListener('change', checkFormReady);

        submitBtn.addEventListener('click', async () => {
            haptic();
            submitBtn.disabled = true;
            submitBtn.textContent = text('waitlist.webapp_sending', 'Отправляю...');
            const startDate = dateInput.value;
            await submitToApi('waitlist', {
                start_date: startDate,
                client_name: nameInput.value.trim(),
                task: taskInput.value.trim(),
            });
            form.innerHTML = `
                <div class="booking-form__done">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M20 6 9 17l-5-5"/></svg>
                    <h3>${escapeHtml(text('waitlist.webapp_sent_title', 'Бронь отправлена!'))}</h3>
                    <p>${escapeHtml(text('waitlist.webapp_confirmed', 'Свяжусь с вами в ближайшее время для уточнения деталей'))}</p>
                </div>
            `;
        });
    },
};

/* === Services Page === */

const ServicesPage = {
    renderCategories() {
        AppState.services.level = 'categories';
        AppState.services.catId = null;
        AppState.services.subcatId = null;

        const container = document.getElementById('services-content');
        const cats = Array.isArray(DATA.services) ? DATA.services : [];

        container.innerHTML = cats.map(cat => `
            <button class="service-card animate-in" data-cat-id="${cat.id}">
                <span class="service-card__icon"><i data-lucide="${escapeHtml(cat.icon || 'circle')}"></i></span>
                <span class="service-card__body">
                    <strong class="service-card__name">${escapeHtml(cat.name || DATA.categoryNames[cat.id] || cat.id)}</strong>
                    <small class="service-card__desc">${escapeHtml(cat.description || '')}</small>
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
        animateIn(container);
    },

    renderSubcategories(catId) {
        AppState.services.level = 'subcategories';
        AppState.services.catId = catId;

        const cat = DATA.services.find(c => c.id === catId);
        if (!cat) return;

        const catName = cat.name || DATA.categoryNames[catId] || catId;
        const container = document.getElementById('services-content');

        const breadcrumb = `
            <div class="breadcrumb">
                <button class="breadcrumb__link" data-back="categories">${escapeHtml(labelText('menu.services', 'Услуги'))}</button>
                <span class="breadcrumb__sep">/</span>
                <span class="breadcrumb__current">${escapeHtml(catName)}</span>
            </div>
        `;

        const cards = cat.subcategories.map(sub => `
            <button class="service-card animate-in" data-subcat-id="${sub.id}">
                <span class="service-card__body">
                    <strong class="service-card__name">${escapeHtml(sub.name || DATA.subcategoryNames[sub.id] || sub.id)}</strong>
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
        animateIn(container);
    },

    renderTariffs(catId, subcatId) {
        AppState.services.level = 'tariffs';
        AppState.services.subcatId = subcatId;

        const cat = DATA.services.find(c => c.id === catId);
        if (!cat) return;
        const sub = cat.subcategories.find(s => s.id === subcatId);
        if (!sub) return;

        const catName = cat.name || DATA.categoryNames[catId] || catId;
        const subName = sub.name || DATA.subcategoryNames[subcatId] || subcatId;
        const container = document.getElementById('services-content');

        const breadcrumb = `
            <div class="breadcrumb">
                <button class="breadcrumb__link" data-back="categories">${escapeHtml(labelText('menu.services', 'Услуги'))}</button>
                <span class="breadcrumb__sep">/</span>
                <button class="breadcrumb__link" data-back="subcategories">${ escapeHtml(catName)}</button>
                <span class="breadcrumb__sep">/</span>
                <span class="breadcrumb__current">${escapeHtml(subName)}</span>
            </div>
        `;

        const cards = sub.tariffs.map(t => {
            const shortDesc = String(t.description || '').split('\n')[0];
            return `
                <button class="tariff-card animate-in" data-tariff-id="${t.id}">
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
        animateIn(container);
    },

    showTariffDetail(catId, tariff) {
        const catName = DATA.categoryNames[catId] || catId;

        openOverlay(`
            <div class="tariff-detail">
                <span class="tariff-detail__badge">${escapeHtml(tariff.name)}</span>
                <h2 class="tariff-detail__cat">${escapeHtml(catName)}</h2>
                <div class="tariff-detail__price">${escapeHtml(tariff.price)}</div>
                <div class="tariff-detail__desc">${formatDescription(tariff.description)}</div>
                <button class="btn btn--primary tariff-detail__cta" data-tariff-quiz="${tariff.id}">${escapeHtml(labelText('services.order', 'Обсудить этот вариант'))}</button>
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
            p => filter === 'all' || (p.category && p.category.split(',').includes(filter))
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
                <article class="portfolio-item animate-in" data-pf-id="${escapeHtml(String(item.id || ''))}">
                    ${media}
                    <div class="portfolio-item__body">
                        <h3 class="portfolio-item__title">${escapeHtml(item.title)}</h3>
                        ${item.description ? `<p class="portfolio-item__desc">${nl2br(escapeHtml(item.description))}</p>` : ''}
                        <div class="portfolio-item__actions">
                            ${item.url ? `
                                <a class="portfolio-item__btn" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
                                    <i data-lucide="external-link"></i>
                                    ${escapeHtml(labelText('portfolio.open_site', 'Открыть сайт'))}
                                </a>
                            ` : ''}
                            <button class="portfolio-item__btn portfolio-item__btn--fav ${isFav ? 'portfolio-item__btn--fav-active' : ''}" data-fav-id="${escapeHtml(String(item.id || ''))}">
                                <i data-lucide="heart"></i>
                                ${escapeHtml(text(isFav ? 'portfolio.favorites_added' : 'portfolio.favorites_add', isFav ? 'В избранном' : 'В избранное'))}
                            </button>
                        </div>
                        ${item.tags ? `<span class="portfolio-item__tag">${escapeHtml(portfolioCategoryLabel(item.tags) || item.tags)}</span>` : ''}
                    </div>
                </article>
            `;
        }).join('');

        lucide.createIcons();
        animateIn(feed);
        this.observeVideos();
    },

    observeVideos() {
        const videos = document.querySelectorAll('video[data-src]');
        if (!videos.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target;
                if (entry.isIntersecting && !video.src) {
                    video.src = video.dataset.src;
                    video.play().catch(() => {});
                }
            });
        }, { rootMargin: '200px' });

        videos.forEach(v => observer.observe(v));
    },

    renderMedia(item) {
        if (!item.image) return '';

        if (isVideoUrl(item.image)) {
            return `<video class="portfolio-item__media" data-src="${escapeHtml(item.image)}" muted loop playsinline preload="none"></video>`;
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
            if (textNode) {
                textNode.textContent = ` ${text(isFav ? 'portfolio.favorites_added' : 'portfolio.favorites_add', isFav ? 'В избранном' : 'В избранное')}`;
            }

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

    TYPE_TEXT_KEYS: {
        landing: 'calculator.type_landing',
        card: 'calculator.type_card',
        corporate: 'calculator.type_corporate',
        shop: 'calculator.type_shop',
    },

    TYPE_HINT_KEYS: {
        landing: 'calculator.type_landing_hint',
        card: 'calculator.type_card_hint',
        corporate: 'calculator.type_corporate_hint',
        shop: 'calculator.type_shop_hint',
    },

    PAGES_TEXT_KEYS: {
        '1_3': 'calculator.pages_1_3',
        '4_7': 'calculator.pages_4_7',
        '8_15': 'calculator.pages_8_15',
        '15plus': 'calculator.pages_15plus',
    },

    DESIGN_TEXT_KEYS: {
        ready: 'calculator.design_ready',
        examples: 'calculator.design_examples',
        needed: 'calculator.design_needed',
    },

    FEATURE_TEXT_KEYS: {
        forms: 'calculator.feat_forms',
        crm: 'calculator.feat_crm',
        catalog: 'calculator.feat_catalog',
        payment: 'calculator.feat_payment',
        i18n: 'calculator.feat_i18n',
        seo: 'calculator.feat_seo',
    },

    TIMELINE_TEXT_KEYS: {
        standard: 'calculator.timeline_standard',
        urgent: 'calculator.timeline_urgent',
    },

    resolveLabel(mapping, value, fallback = '') {
        const key = mapping[value];
        return key ? text(key, fallback || value || '') : (fallback || value || '');
    },

    getTypeLabel(value) {
        return this.resolveLabel(this.TYPE_TEXT_KEYS, value, value);
    },

    getPagesLabel(value) {
        return this.resolveLabel(this.PAGES_TEXT_KEYS, value, value);
    },

    getDesignLabel(value) {
        return this.resolveLabel(this.DESIGN_TEXT_KEYS, value, value);
    },

    getFeatureLabel(value) {
        return this.resolveLabel(this.FEATURE_TEXT_KEYS, value, value);
    },

    getTimelineLabel(value) {
        return this.resolveLabel(this.TIMELINE_TEXT_KEYS, value, value);
    },

    getTypeBasePrice(value) {
        const basePrices = DATA.calculator?.basePrices || {};
        return basePrices[value] || basePrices.default || 0;
    },

    syncTexts() {
        const setCalcText = (selector, value) => {
            const el = document.querySelector(selector);
            if (el && value) el.textContent = value;
        };

        setCalcText('#calcBackBtn span', text('common.back', 'Назад'));
        setCalcText('[data-calc-step="1"] .calc-step__title', text('calculator.step1', 'Какой сайт нужен?'));
        setCalcText('[data-calc-step="1"] .calc-step__subtitle', text('calculator.step1_subtitle', 'Выберите тип проекта'));
        setCalcText('[data-calc-step="2"] .calc-step__title', text('calculator.step2', 'Сколько страниц?'));
        setCalcText('[data-calc-step="2"] .calc-step__subtitle', text('calculator.step2_subtitle', 'Примерный объем сайта'));
        setCalcText('[data-calc-step="3"] .calc-step__title', text('calculator.step3', 'Дизайн-макет'));
        setCalcText('[data-calc-step="3"] .calc-step__subtitle', text('calculator.step3_subtitle', 'Есть готовый или нужен с нуля?'));
        setCalcText('[data-calc-step="4"] .calc-step__title', text('calculator.step4', 'Функционал'));
        setCalcText('[data-calc-step="4"] .calc-step__subtitle', text('calculator.step4_subtitle', 'Что нужно на сайте? Можно несколько'));
        setCalcText('[data-calc-step="5"] .calc-step__title', text('calculator.step5', 'Сроки'));
        setCalcText('[data-calc-step="5"] .calc-step__subtitle', text('calculator.step5_subtitle', 'Насколько срочно?'));

        const typeFallbacks = {
            landing: ['Лендинг', 'Одностраничный сайт'],
            card: ['Сайт-визитка', '2-5 страниц'],
            corporate: ['Корпоративный сайт', 'Полноценный сайт компании'],
            shop: ['Интернет-магазин', 'Каталог, корзина, оплата'],
        };
        Object.entries(typeFallbacks).forEach(([type, [titleFallback, hintFallback]]) => {
            setCalcText(`[data-type="${type}"] .option__text strong`, this.getTypeLabel(type) || titleFallback);
            setCalcText(`[data-type="${type}"] .option__text small`, text(this.TYPE_HINT_KEYS[type], hintFallback));
            setCalcText(
                `[data-type="${type}"] .option__price`,
                `${text('calculator.from_prefix', 'от')} ${formatCompactRub(this.getTypeBasePrice(type))}`,
            );
        });

        const pageFallbacks = {
            '1_3': '1-3 страницы',
            '4_7': '4-7 страниц',
            '8_15': '8-15 страниц',
            '15plus': '15+ страниц',
        };
        Object.entries(pageFallbacks).forEach(([value, fallback]) => {
            setCalcText(`[data-pages="${value}"] .option__text strong`, this.getPagesLabel(value) || fallback);
        });

        const designFallbacks = {
            ready: 'Есть готовый макет',
            examples: 'Есть примеры / референсы',
            needed: 'Нужен дизайн с нуля',
        };
        Object.entries(designFallbacks).forEach(([value, fallback]) => {
            setCalcText(`[data-design="${value}"] .option__text strong`, this.getDesignLabel(value) || fallback);
        });

        Object.entries(this.FEATURE_TEXT_KEYS).forEach(([value, key]) => {
            setCalcText(`[data-feature="${value}"]`, text(key, value));
        });

        setCalcText('.calc-step__next[data-next]', text('common.next_label', 'Далее'));

        setCalcText('[data-timeline="standard"] .option__text strong', this.getTimelineLabel('standard') || 'Стандартные сроки');
        setCalcText('[data-timeline="urgent"] .option__text strong', this.getTimelineLabel('urgent') || 'Срочно (1-2 недели)');
        const urgentMultiplier = DATA.calculator?.urgencyMultiplier?.urgent || 1.5;
        setCalcText(
            '[data-timeline="urgent"] .option__text small',
            interpolateText(text('calculator.timeline_urgent_note', 'x{x} к стоимости'), { x: urgentMultiplier }),
        );

        setCalcText('.calc-result__title', text('calculator.webapp_title', 'Предварительный расчет'));
        setCalcText('.calc-result__note', text('calculator.webapp_result_note', 'Это ориентировочная оценка. Точную цену назову после короткого разговора о деталях.'));
        setCalcText('#calcSubmitBtn', labelText('calculator.to_quiz', 'Обсудить проект'));
        setCalcText('#calcRestartBtn', text('calculator.restart', 'Пересчитать'));
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
            ? st.features.map(f => this.getFeatureLabel(f)).join(', ')
            : text('calculator.empty_features', 'Не выбран');

        document.getElementById('calcResultSummary').innerHTML =
            `<span>${escapeHtml(text('calculator.webapp_type', 'Тип сайта:'))}</span> ${escapeHtml(this.getTypeLabel(st.type) || '-')}<br>` +
            `<span>${escapeHtml(text('calculator.webapp_pages', 'Страниц:'))}</span> ${escapeHtml(this.getPagesLabel(st.pages) || '-')}<br>` +
            `<span>${escapeHtml(text('calculator.webapp_design', 'Дизайн:'))}</span> ${escapeHtml(this.getDesignLabel(st.design) || '-')}<br>` +
            `<span>${escapeHtml(text('calculator.webapp_features', 'Функции:'))}</span> ${escapeHtml(features)}<br>` +
            `<span>${escapeHtml(text('calculator.webapp_timeline', 'Сроки:'))}</span> ${escapeHtml(this.getTimelineLabel(st.timeline) || '-')}`;
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
            this.showResult();
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
            <div class="review-card animate-in">
                <div class="review-card__header">
                    <strong class="review-card__name">${escapeHtml(r.name || '')}</strong>
                    ${r.company ? `<span class="review-card__company">${escapeHtml(r.company)}</span>` : ''}
                </div>
                <p class="review-card__text">${nl2br(escapeHtml(r.text || ''))}</p>
            </div>
        `).join('');

        animateIn(list);
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
            <div class="case-card animate-in">
                <h3 class="case-card__title">${escapeHtml(c.title || '')}</h3>
                ${c.task ? `<div class="case-card__section"><strong>${escapeHtml(text('reviews.task', 'Задача'))}:</strong><p>${nl2br(escapeHtml(c.task))}</p></div>` : ''}
                ${c.solution ? `<div class="case-card__section"><strong>${escapeHtml(text('reviews.solution', 'Решение'))}:</strong><p>${nl2br(escapeHtml(c.solution))}</p></div>` : ''}
                ${c.result ? `<div class="case-card__section"><strong>${escapeHtml(text('reviews.result', 'Результат'))}:</strong><p>${nl2br(escapeHtml(c.result))}</p></div>` : ''}
                ${c.url ? `<a class="btn btn--secondary case-card__link" href="${escapeHtml(c.url)}" target="_blank">${escapeHtml(labelText('reviews.open_site', 'Открыть сайт'))}</a>` : ''}
            </div>
        `).join('');

        animateIn(list);
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
            <div class="accordion__item animate-in" data-faq-index="${i}">
                <button class="accordion__header">
                    <span class="accordion__q-icon"><i data-lucide="help-circle"></i></span>
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
        animateIn(list);
    },
};

/* === Quiz Page === */

const QuizPage = {
    DESIGN_IRRELEVANT_TYPES: DATA.quiz.designIrrelevantTypes,

    renderTypeChoice() {
        const container = document.getElementById('quiz-content');

        container.innerHTML = `
            <header class="page__header">
                <h1 class="page__title">${escapeHtml(labelText('menu.request', 'Обсудить проект'))}</h1>
            </header>
            <p class="quiz-intro">${escapeHtml(text('quiz.choose_type', 'Выберите формат - отвечу в ближайшее время'))}</p>
            <div class="quiz-types">
                <button class="quiz-type-card animate-in" data-quiz-type="quick">
                    <span class="quiz-type-card__icon quiz-type-card__icon--quick"><i data-lucide="zap"></i></span>
                    <strong>${escapeHtml(labelText('quiz.quick', 'Быстрый опрос'))}</strong>
                    <small>${escapeHtml(text('quiz.quick_desc', '4 вопроса - 1 минута'))}</small>
                </button>
                <button class="quiz-type-card animate-in" data-quiz-type="detailed">
                    <span class="quiz-type-card__icon quiz-type-card__icon--detailed"><i data-lucide="clipboard-list"></i></span>
                    <strong>${escapeHtml(labelText('quiz.detailed', 'Подробный опрос'))}</strong>
                    <small>${escapeHtml(text('quiz.detailed_desc', '7 вопросов - 3 минуты'))}</small>
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
        animateIn(container);
    },

    startQuiz(type) {
        AppState.quiz.type = type;
        AppState.quiz.answers = {};
        AppState.quiz.currentStep = 0;

        const tgUser = tg?.initDataUnsafe?.user;
        if (tgUser?.id) {
            fetch(`${API_URL}/api/quiz-start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegram_id: tgUser.id, quiz_type: type, initData: tg?.initData || '' }),
            }).catch(() => {});
        }

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

        const progressWidth = (current / total) * 100;

        let backBtn = '';
        if (AppState.quiz.currentStep > 0) {
            backBtn = `<button class="quiz-back" data-quiz-back><i data-lucide="arrow-left"></i> ${escapeHtml(text('common.back', 'Назад'))}</button>`;
        }

        let content = '';

        switch (step) {
            case 'site_type':
                content = this.renderOptions(
                    text('quiz.q_site_type', 'Какой сайт нужен?'),
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
                    text('quiz.q_has_design', 'Есть дизайн-макет?'),
                    DATA.quiz.designOptions.map(d => ({
                        value: d.value,
                        label: d.label,
                    })),
                    'has_design'
                );
                break;

            case 'budget':
                content = this.renderOptions(
                    text('quiz.q_budget', 'Какой бюджет планируете?'),
                    DATA.quiz.budgetOptions.map(b => ({
                        value: b.value,
                        label: b.label,
                    })),
                    'budget'
                );
                break;

            case 'contact':
                content = this.renderTextStep(
                    text('quiz.q_contact', 'Как с вами связаться?'),
                    'Имя, Telegram или телефон',
                    'contact'
                );
                break;

            case 'about':
                content = this.renderTextStep(
                    text('quiz.q_about', 'Расскажите о проекте'),
                    'Чем занимается компания, для чего сайт...',
                    'about'
                );
                break;

            case 'features':
                content = this.renderMultiSelect(
                    text('quiz.q_features', 'Какой функционал нужен?'),
                    DATA.quiz.featureOptions.map(f => ({
                        value: f.value,
                        label: f.label,
                    })),
                    'features'
                );
                break;

            case 'examples':
                content = this.renderTextStep(
                    text('quiz.q_examples', 'Есть примеры сайтов, которые нравятся?'),
                    'Ссылки или описание (можно пропустить)',
                    'examples',
                    true
                );
                break;

            case 'budget_timeline':
                content = this.renderTextStep(
                    text('quiz.q_budget_timeline', 'Бюджет и сроки'),
                    'Примерный бюджет и когда нужен сайт',
                    'budget_timeline'
                );
                break;
        }

        container.innerHTML = `
            <div class="quiz-progress"><div class="quiz-progress__bar" style="width: ${progressWidth}%"></div></div>
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
        animateIn(container);
    },

    renderOptions(title, options, key) {
        const items = options.map(opt => `
            <button class="quiz-option animate-in" data-quiz-value="${escapeHtml(opt.value)}">
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
            <button class="btn btn--primary quiz-next" data-quiz-next>${escapeHtml(text('common.next_label', 'Далее'))}</button>
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
            <button class="btn btn--primary quiz-next" data-quiz-send>${escapeHtml(text('common.next_label', 'Далее'))}</button>
            ${skippable ? `<button class="btn btn--secondary quiz-skip" data-quiz-skip>${escapeHtml(labelText('quiz.skip', 'Пропустить'))}</button>` : ''}
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
                <h2 class="quiz-done__title">${escapeHtml(text('quiz.thank_you', 'Заявка отправлена'))}</h2>
                <p class="quiz-done__text">${escapeHtml(text('quick_question.webapp_sent', 'Свяжусь с вами в ближайшее время'))}</p>
                <button class="btn btn--secondary quiz-done__home" data-quiz-home>${escapeHtml(text('common.home', 'На главную'))}</button>
            </div>
        `;

        const payload = {
            quiz_type: AppState.quiz.type,
            ...AppState.quiz.answers,
        };

        if (AppState.favorites.length) {
            const favItems = DATA.portfolio.filter(p => AppState.favorites.includes(p.id));
            payload.favorites = favItems.map(p => p.title).join(', ');
        }

        submitToApi('quiz-submit', payload);

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
        document.getElementById('auditSubmitBtn').addEventListener('click', async () => {
            haptic();
            const input = document.getElementById('auditUrlInput');
            const url = input.value.trim();

            if (!url || !url.includes('.')) {
                input.classList.add('input--error');
                setTimeout(() => input.classList.remove('input--error'), 1500);
                return;
            }

            const note = document.querySelector('.audit__note');
            if (note) {
                note.textContent = text('audit.loading', 'Анализирую сайт...');
                note.classList.remove('audit__note--success');
            }

            const ok = await submitToApi('audit', { url });
            input.value = '';
            if (note) {
                note.textContent = ok
                    ? text('audit.webapp_success_note', 'Результат отправлен в чат с ботом')
                    : text('audit.webapp_error_note', 'Ошибка, попробуйте позже');
                if (ok) note.classList.add('audit__note--success');
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
            <div class="promo-card animate-in">
                ${promo.discount ? `<span class="promo-card__badge">${escapeHtml(promo.discount)}</span>` : ''}
                <h3 class="promo-card__title">${escapeHtml(promo.title || '')}</h3>
                <p class="promo-card__text">${nl2br(escapeHtml(promo.text || ''))}</p>
                ${promo.code ? `
                    <div class="promo-card__code">
                        <span>${escapeHtml(promo.code)}</span>
                        <button class="promo-card__copy" data-copy="${escapeHtml(promo.code)}" aria-label="${escapeHtml(text('promo.copy', 'Скопировать'))}">
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
                    timerEl.textContent = text('promo.finished', 'Акция завершена');
                    return;
                }

                const days = Math.floor(diff / 86400000);
                const hours = Math.floor((diff % 86400000) / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);

                const parts = [];
                if (days > 0) parts.push(`${days}д`);
                parts.push(`${hours}ч`);
                parts.push(`${minutes}мин`);

                timerEl.textContent = `${text('promo.time_left', 'Осталось')}: ${parts.join(' ')}`;
            };

            update();
            this.timers.push(setInterval(update, 60000));
        });

        lucide.createIcons();
        animateIn(list);
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
    applyStaticTexts();
    initTabBar();
    initMoreMenu();
    initOverlay();
    HomePage.init();
    CalculatorPage.initEvents();
    AuditPage.init();
    ContactPage.init();

    await loadLiveData();

    const validIds = DATA.portfolio.map(p => p.id);
    AppState.favorites = AppState.favorites.filter(id => validIds.includes(id));
    localStorage.setItem('favorites', JSON.stringify(AppState.favorites));

    PortfolioPage.init();
    ReviewsPage.render();
    CasesPage.render();
    FaqPage.render();
    PromosPage.render();
    ServicesPage.renderCategories();

    Router.navigate('home');
});
