/* === Fallback Guards === */

if (typeof DATA === 'undefined') window.DATA = { portfolio: [], reviews: [], cases: [], faq: [], promos: [], services: [], contact: {}, quiz: { designIrrelevantTypes: [], siteTypes: [], designOptions: [], budgetOptions: [], featureOptions: [] }, calculator: { basePrices: {}, pageMultipliers: {}, designMultipliers: {}, featureCosts: {}, urgencyMultiplier: {} }, categoryNames: {}, subcategoryNames: {}, tariffPrefill: { siteType: {}, budget: {} } };
if (typeof lucide === 'undefined') window.lucide = { createIcons: function() {} };

/* === Telegram WebApp Init === */

const tg = window.Telegram?.WebApp;
const PROD_HOSTS = new Set(['bot.yanksweb.ru', '185.103.252.41']);
const REVIEWS_CHANNEL_URL = 'https://t.me/yanksweb_reviews';
const IS_PROD_MINIAPP = PROD_HOSTS.has(window.location.hostname);
const BOOT_STARTED_AT = performance.now();
const MIN_LOADER_VISIBLE_MS = 320;
const LOADER_FADE_MS = 240;
if (tg) {
    tg.ready();
    tg.expand();
    tg.BackButton?.onClick(() => {
        // Overlay closes first if open
        const overlay = document.getElementById('detail-overlay');
        if (overlay && overlay.classList.contains('overlay--open')) {
            if (typeof closeOverlay === 'function') {
                closeOverlay();
            } else {
                overlay.classList.remove('overlay--open');
            }
            return;
        }

        // More menu closes if open
        const moreMenu = document.getElementById('more-menu');
        if (moreMenu && moreMenu.classList.contains('more-menu--open')) {
            if (typeof toggleMoreMenu === 'function') toggleMoreMenu();
            return;
        }

        // Services drill down
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

        // Calculator: step back to previous step
        if (AppState.currentPage === 'calculator' && typeof CalculatorPage !== 'undefined') {
            if (AppState.calculator.history && AppState.calculator.history.length > 1) {
                CalculatorPage.goBack?.();
                return;
            }
        }

        // Cases: close detail view
        if (AppState.currentPage === 'cases' && typeof CasesPage !== 'undefined') {
            if (CasesPage._view === 'detail') {
                CasesPage._cleanupSlider?.();
                CasesPage._view = 'list';
                CasesPage.render?.();
                return;
            }
        }

        const prev = Router.history.pop() || 'home';
        Router._isBack = true;
        Router.navigate(prev);
        Router._isBack = false;
    });
}

function haptic(type = 'light') {
    try {
        if (type === 'success' || type === 'error' || type === 'warning') {
            tg?.HapticFeedback?.notificationOccurred?.(type);
        } else {
            tg?.HapticFeedback?.impactOccurred?.(type);
        }
    } catch (e) { /* noop */ }
}

function setBootStatus(message) {
    const label = document.getElementById('appLoaderText');
    if (label && message) label.textContent = message;
}

async function revealApp() {
    const elapsed = performance.now() - BOOT_STARTED_AT;
    const remaining = Math.max(0, MIN_LOADER_VISIBLE_MS - elapsed);
    if (remaining) {
        await new Promise(resolve => setTimeout(resolve, remaining));
    }

    document.body.classList.add('app-ready');
    document.getElementById('app')?.setAttribute('aria-busy', 'false');
    document.getElementById('app-loader')?.classList.add('app-loader--hidden');
    window.setTimeout(() => {
        document.body.classList.remove('app-loading');
    }, LOADER_FADE_MS);
}

function nextFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
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
        const body = await res.json().catch(() => null);
        return {
            ok: Boolean(res.ok && (!body || body.success !== false)),
            status: res.status,
            data: body?.data || {},
            error: body?.error || '',
        };
    } catch {
        return {
            ok: false,
            status: 0,
            data: {},
            error: '',
        };
    }
}

function directContactUrl() {
    const username = String(DATA?.contact?.username || '').replace(/^@/, '').trim();
    return username ? `https://t.me/${username}` : '';
}

function openDirectContact() {
    const url = directContactUrl();
    if (!url) {
        Router.navigate('contact');
        return;
    }
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(url);
        return;
    }
    if (tg?.openLink) {
        tg.openLink(url);
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}

function showToast(message, options = {}) {
    const root = document.getElementById('app-toast-root');
    if (!root || !message) return;

    const toast = document.createElement('div');
    toast.className = `app-toast app-toast--${options.type || 'info'}`;
    toast.innerHTML = `
        <div class="app-toast__body">
            <div class="app-toast__text">${escapeHtml(message)}</div>
            ${options.actionLabel ? `<button class="app-toast__action" type="button">${escapeHtml(options.actionLabel)}</button>` : ''}
        </div>
    `;

    const actionBtn = toast.querySelector('.app-toast__action');
    if (actionBtn && typeof options.onAction === 'function') {
        actionBtn.addEventListener('click', () => {
            haptic();
            options.onAction();
            toast.classList.remove('app-toast--visible');
            window.setTimeout(() => toast.remove(), 220);
        });
    }

    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('app-toast--visible'));

    const duration = options.duration ?? 3600;
    window.setTimeout(() => {
        toast.classList.remove('app-toast--visible');
        window.setTimeout(() => toast.remove(), 220);
    }, duration);
}

function showRequestError(message) {
    showToast(
        message || text('common.error', 'Что-то пошло не так'),
        {
            type: 'error',
            duration: 6500,
            actionLabel: text('contact.write', 'Написать мне'),
            onAction: openDirectContact,
        }
    );
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
        result = result.split(`{${key}}`).join(String(value ?? ''));
    }
    return result;
}

/* Язык пользователя Telegram (ru по умолчанию). */
function getUserLang() {
    try {
        const lc = (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe
            && Telegram.WebApp.initDataUnsafe.user && Telegram.WebApp.initDataUnsafe.user.language_code) || '';
        return String(lc).toLowerCase().startsWith('en') ? 'en' : 'ru';
    } catch (e) { return 'ru'; }
}

/* Словоформа по числу: в EN - one/other, в RU - one/few/many.
   text(key, fb) ищет ключ в текущем языке. Если ключа нет - fb.
   Вызов: pickPlural(n, 'promo.days_one', 'promo.days_few', 'promo.days_many',
                     { one: 'день', few: 'дня', many: 'дней', en: 'day', enMany: 'days' }) */
function pickPlural(n, keyOne, keyFew, keyMany, fallbacks) {
    n = Math.abs(Math.floor(n));
    const fb = fallbacks || {};
    if (getUserLang() === 'en') {
        return n === 1 ? text(keyOne, fb.en || '') : text(keyMany, fb.enMany || fb.en || '');
    }
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return text(keyOne, fb.one || '');
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return text(keyFew, fb.few || '');
    return text(keyMany, fb.many || '');
}

/* "2h 30m" / "2 ч 30 мин" / "30m" / "30 мин" - формат времени.
   hourFmt/minFmt - шаблоны, interpolated {h}/{m}. */
function formatHourMin(seconds) {
    const total = Math.max(0, Math.floor(seconds || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours > 0 && minutes > 0) {
        return interpolateText(text('common.time_hm', '{h} ч {m} мин'), { h: hours, m: minutes });
    }
    if (hours > 0) {
        return interpolateText(text('common.time_h', '{h} ч'), { h: hours });
    }
    return interpolateText(text('common.time_m', '{m} мин'), { m: Math.max(1, minutes) });
}

function leadSuccessCopy() {
    const title = text('miniapp_ui.lead_thank_title', 'Спасибо, ваша заявка принята!');
    const body = text('miniapp_ui.lead_thank_body', 'Свяжусь с вами в ближайшее время для уточнения деталей.');
    return {
        title,
        body,
        short: `${title} ${body}`,
    };
}

function quizSuccessCopy() {
    const success = leadSuccessCopy();
    const handle = String(DATA?.contact?.username || '').replace(/^@/, '').trim();
    const directHandle = handle ? `@${handle}` : '';
    return {
        title: success.title,
        body: success.body,
        handle: directHandle,
    };
}

function formatCompactRub(amount) {
    return `${Math.round(amount || 0).toLocaleString('ru-RU')} ₽`;
}

function portfolioCategoryLabel(category) {
    const mapping = {
        all: ['miniapp.filter.all', 'Все'],
        sites: ['miniapp.filter.sites', 'Сайты'],
        shops: ['miniapp.filter.shops', 'Магазины'],
        design: ['miniapp.filter.design', 'Дизайн'],
    };
    if (category && category.includes(',')) {
        const first = category.split(',')[0].trim();
        const [key, fallback] = mapping[first] || [];
        return key ? text(key, fallback) : first;
    }
    const [key, fallback] = mapping[category] || [];
    return key ? text(key, fallback) : category;
}

function applyStaticTexts() {
    const userLang = tg?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru';
    document.documentElement.lang = userLang;

    const setText = (selector, value) => {
        const el = document.querySelector(selector);
        if (el && value) el.textContent = value;
    };

    const setPlaceholder = (selector, value) => {
        const el = document.querySelector(selector);
        if (el && value) el.setAttribute('placeholder', value);
    };

    const setAriaLabel = (selector, value) => {
        const el = document.querySelector(selector);
        if (el && value) el.setAttribute('aria-label', value);
    };

    setText('.hero__tagline', text('home.tagline', 'Сайты под ключ - от дизайна до запуска'));

    const homeSectionTitles = document.querySelectorAll('[data-page="home"] .section-title');
    if (homeSectionTitles[0]) homeSectionTitles[0].textContent = text('home.quick_actions_title', 'Быстрые действия');
    if (homeSectionTitles[1]) homeSectionTitles[1].textContent = text('home.quick_question_title', 'Быстрый вопрос');
    if (homeSectionTitles[2]) homeSectionTitles[2].textContent = text('home.booking_title', 'Бронирование');

    setText('[data-page="services"] .page__title', text('services.title', 'Услуги и цены'));
    setText('[data-page="portfolio"] .page__title', labelText('portfolio.title', 'Мои работы'));
    setText('[data-page="reviews"] .page__title', text('reviews.title', 'Отзывы'));
    const _reviewsAllBtn = document.querySelector('[data-page="reviews"] .reviews-header-link');
    if (_reviewsAllBtn) _reviewsAllBtn.setAttribute('aria-label', text('miniapp_ui.reviews_all', 'Все отзывы'));
    setText('[data-page="cases"] .page__title', text('reviews.cases_title', 'Кейсы'));
    setText('[data-page="faq"] .page__title', text('faq.title', 'Частые вопросы'));
    setText('[data-page="audit"] .page__title', text('audit.title', 'Аудит сайта'));
    setText('[data-page="contact"] .page__title', labelText('contact.title', 'Написать напрямую'));
    setText('[data-page="promos"] .page__title', text('promo.title', 'Акции'));
    const _isEnStack = getUserLang() === 'en';
    setText('[data-page="stack"] .page__title', text('stack.title', _isEnStack ? 'Tech stack' : 'Стек технологий'));
    setText('[data-page="stack"] .stack__intro', text('stack.intro', _isEnStack ? "What I work with on projects. Don't see your stack? Just ask - I've probably used it too." : 'С чем работаю и что использую в проектах. Если не нашли свой вариант - напишите, скорее всего тоже знаком.'));
    setText('[data-navigate="stack"] .quick-actions__label', text('miniapp.tab.stack', _isEnStack ? 'Technologies' : 'Технологии'));

    setText('[data-navigate="services"] .quick-actions__label', text('miniapp.qa.services', 'Услуги'));
    setText('[data-navigate="calculator"] .quick-actions__label', text('miniapp.qa.calculator', 'Расчет'));
    setText('[data-navigate="quiz"] .quick-actions__label', text('miniapp.qa.quiz', 'Обсудить проект'));
    setText('[data-navigate="audit"] .quick-actions__label', text('miniapp.qa.audit', 'Аудит сайта'));

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

    setText('#portfolioFilters [data-filter="all"]', text('miniapp.filter.all', 'Все'));
    setText('#portfolioFilters [data-filter="sites"]', text('miniapp.filter.sites', 'Сайты'));
    setText('#portfolioFilters [data-filter="shops"]', text('miniapp.filter.shops', 'Магазины'));
    setText('#portfolioFilters [data-filter="design"]', text('miniapp.filter.design', 'Дизайн'));
    setText('#portfolioEmpty p', text('portfolio.empty', 'Работы скоро появятся'));
    setText('#reviewsEmpty p', text('reviews.empty', 'Отзывы скоро появятся'));
    setText('#casesEmpty p', text('reviews.cases_empty', 'Кейсы скоро появятся'));
    setText('#faqEmpty p', text('faq.empty', 'Раздел в разработке'));
    setText('#promosEmpty p', text('promo.empty', 'Сейчас акций нет, но они скоро появятся'));

    setPlaceholder('#auditUrlInput', text('audit.enter_url', 'https://example.com'));
    setText('#auditSubmitBtn', text('audit.webapp_submit', 'Проверить'));
    setText('.contact-card__name', text('contact.name', 'Даниил'));
    setText('#contactLink', labelText('contact.write', 'Написать в Telegram'));
    setText('.contact-card__desc', text('contact.text', DATA?.contact?.description || ''));

    setText('#tab-bar [data-page="home"] span', text('miniapp.tab.home', 'Главная'));
    setText('#tab-bar [data-page="services"] span', text('miniapp.tab.services', 'Услуги'));
    setText('#tab-bar [data-page="portfolio"] span', text('miniapp.tab.portfolio', 'Работы'));
    setText('#tab-bar [data-page="calculator"] span', text('miniapp.tab.calculator', 'Расчет'));

    setText('#more-menu [data-navigate="reviews"] span:last-child', text('miniapp.more.reviews', 'Отзывы'));
    setText('#more-menu [data-navigate="cases"] span:last-child', text('miniapp.more.cases', 'Кейсы'));
    setText('#more-menu [data-navigate="faq"] span:last-child', text('miniapp.more.faq', 'FAQ'));
    setText('#more-menu [data-navigate="audit"] span:last-child', text('miniapp.more.audit', 'Аудит сайта'));
    setText('#more-menu [data-navigate="contact"] span:last-child', text('miniapp.more.contact', 'Контакт'));
    setText('#more-menu [data-navigate="promos"] span:last-child', text('miniapp.more.promos', 'Акции'));

    setAriaLabel('#quickQuestionSend', text('miniapp_ui.aria_send', 'Отправить'));
    setAriaLabel('#chatSend', text('miniapp_ui.aria_send', 'Отправить'));
    setAriaLabel('#calcBackBtn', text('miniapp_ui.aria_back', 'Назад'));
    setAriaLabel('#overlayClose', text('miniapp_ui.aria_close', 'Закрыть'));

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
        availablePromos: [],
        offeredSla: null,
        appliedPromo: null,
        appliedSla: null,
    },
    services: {
        level: 'categories',
        catId: null,
        subcatId: null,
    },
    portfolio: {
        filter: 'all',
    },
    favorites: (() => {
        try {
            return JSON.parse(localStorage.getItem('favorites') || '[]');
        } catch (e) {
            return [];
        }
    })(),
    chat: {
        messages: [],
        session_id: null,
        sending: false,
        rendered: false,
    },
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

        PromosPage.timers.forEach(t => clearInterval(t));
        PromosPage.timers = [];
        if (typeof CasesPage !== 'undefined' && CasesPage._cleanupSlider) CasesPage._cleanupSlider();
        if (AppState.currentPage === 'status' && pageId !== 'status' && typeof StatusPage !== 'undefined') {
            StatusPage.cleanup();
        }
        if (AppState.currentPage === 'home' && pageId !== 'home') {
            HomePage.cleanup();
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
        if (pageId === 'stack') StackPage.render();
        if (pageId === 'portfolio') { PortfolioPage.render(AppState.portfolio?.filter); PortfolioPage.updateFavoritesCount(); }
        if (pageId === 'favorites') FavoritesPage.render();
        if (pageId === 'audit' && !AuditPage._running) AuditPage.renderForm(document.getElementById('auditBody'));
        if (pageId === 'chat') ChatPage.render();

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
        const moreTab = document.querySelector('.tab-bar__tab[data-page="more"]');
        if (moreTab) moreTab.classList.add('tab-bar__tab--active');
    }
}

/* === Focus Trap === */

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
let _activeFocusTrap = null;

function _trapFocusHandler(e) {
    if (e.key !== 'Tab' || !_activeFocusTrap) return;
    const focusable = Array.from(_activeFocusTrap.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
}

let _focusBeforeTrap = null;

function activateFocusTrap(container) {
    _focusBeforeTrap = document.activeElement;
    _activeFocusTrap = container;
    document.addEventListener('keydown', _trapFocusHandler);
    const target = container.querySelector('.overlay__close') || container.querySelector(FOCUSABLE_SELECTOR);
    if (target) { target.focus(); } else { container.setAttribute('tabindex', '-1'); container.focus(); }
}

function deactivateFocusTrap() {
    _activeFocusTrap = null;
    document.removeEventListener('keydown', _trapFocusHandler);
    if (_focusBeforeTrap && _focusBeforeTrap.focus) {
        try { _focusBeforeTrap.focus(); } catch (e) {}
    }
    _focusBeforeTrap = null;
}

/* === More Menu === */

function toggleMoreMenu() {
    const menu = document.getElementById('more-menu');
    const isOpen = menu.classList.toggle('more-menu--open');
    menu.setAttribute('aria-hidden', String(!isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) {
        const sheet = menu.querySelector('.more-menu__sheet');
        activateFocusTrap(sheet);
    } else {
        deactivateFocusTrap();
    }
}

function closeMoreMenu() {
    const menu = document.getElementById('more-menu');
    menu.classList.remove('more-menu--open');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    deactivateFocusTrap();
}

/* === Detail Overlay === */

function openOverlay(html) {
    const overlay = document.getElementById('detail-overlay');
    const content = document.getElementById('detail-content');
    content.innerHTML = html;
    overlay.classList.add('overlay--open');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
    activateFocusTrap(overlay);
}

function closeOverlay() {
    const overlay = document.getElementById('detail-overlay');
    overlay.classList.remove('overlay--open');
    document.body.style.overflow = '';
    deactivateFocusTrap();
}

/* === Chat (AI assistant) Page === */

const ChatPage = {
    els: {},
    _inited: false,
    init() {
        if (this._inited) return;
        const page = document.querySelector('[data-page="chat"]');
        if (!page) return;
        this.els = {
            scroll: page.querySelector('#chatScroll'),
            input: page.querySelector('#chatInput'),
            send: page.querySelector('#chatSend'),
            form: page.querySelector('#chatComposer'),
            cta: page.querySelector('#chatQuoteCta'),
            ctaBtn: page.querySelector('#chatQuoteBtn'),
        };
        if (!this.els.scroll || !this.els.input) return;

        this.els.form.addEventListener('submit', e => {
            e.preventDefault();
            this.send();
        });
        this.els.input.addEventListener('input', () => this._autoresize());
        this.els.input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault();
                this.send();
            }
        });
        this.els.ctaBtn.addEventListener('click', () => this.submitQuote());

        // iOS: при открытии клавиатуры viewport меняется - обновляем CSS-переменную
        // через viewportStableHeight чтобы composer не уезжал за клавиатуру (M12 fix).
        const updateChatHeight = () => {
            const h = window.Telegram?.WebApp?.viewportStableHeight || window.innerHeight;
            document.documentElement.style.setProperty('--chat-viewport-height', h + 'px');
        };
        updateChatHeight();
        try { window.Telegram?.WebApp?.onEvent?.('viewportChanged', updateChatHeight); } catch (e) {}
        window.addEventListener('resize', updateChatHeight);

        this._inited = true;
    },
    render() {
        if (!this._inited) this.init();
        if (!AppState.chat.rendered) {
            this.addMessage('ai', text('chat.greeting',
                'Привет! Я AI-помощник YankSWeb. Опишите задачу - какой сайт нужен, для какого бизнеса, какие есть референсы. Задам уточняющие вопросы и помогу прикинуть бюджет.'
            ));
            AppState.chat.rendered = true;
        }
        this._syncQuoteCta();
        setTimeout(() => {
            if (this.els.input) this.els.input.focus();
        }, 300);
    },
    _autoresize() {
        const i = this.els.input;
        if (!i) return;
        i.style.height = 'auto';
        i.style.height = Math.min(i.scrollHeight, 120) + 'px';
    },
    _scrollBottom() {
        requestAnimationFrame(() => {
            if (this.els.scroll) this.els.scroll.scrollTop = this.els.scroll.scrollHeight;
        });
    },
    _userAvatarContent() {
        const user = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
        if (user.photo_url) {
            return `<img src="${escapeHtml(user.photo_url)}" alt="" loading="lazy">`;
        }
        const first = (user.first_name || '').trim();
        const letter = first ? first.charAt(0).toUpperCase() : (getUserLang() === 'en' ? 'U' : 'Я');
        return escapeHtml(letter);
    },
    _aiAvatarContent() {
        return '<i data-lucide="sparkles"></i>';
    },
    addMessage(role, body, opts = {}) {
        // Предыдущая msg того же автора получает invisible-аватар, чтобы в серии
        // отображался только один (у ближайшего к composer).
        const lastSameRole = this.els.scroll.querySelector(
            `:scope > .msg--${role}:last-child:not([data-typing="1"]) > .msg__avatar`
        );
        if (lastSameRole) lastSameRole.classList.add('msg__avatar--hidden');

        const wrap = document.createElement('div');
        let cls = 'msg msg--' + role;
        if (opts.error) cls += ' msg--error';
        if (opts.success) cls += ' msg--success';
        wrap.className = cls;

        const avatar = document.createElement('div');
        avatar.className = 'msg__avatar';
        avatar.innerHTML = role === 'ai' ? this._aiAvatarContent() : this._userAvatarContent();

        const bubble = document.createElement('div');
        bubble.className = 'msg__bubble';
        if (opts.typing) {
            bubble.innerHTML = '<div class="msg__typing"><span></span><span></span><span></span></div>';
            wrap.dataset.typing = '1';
        } else {
            const textSpan = document.createElement('span');
            textSpan.className = 'msg__bubble-text';
            textSpan.textContent = body;
            if (opts.icon) {
                const iconSpan = document.createElement('span');
                iconSpan.className = 'msg__bubble-icon';
                iconSpan.innerHTML = `<i data-lucide="${escapeHtml(opts.icon)}"></i>`;
                bubble.appendChild(iconSpan);
            }
            bubble.appendChild(textSpan);
        }

        // У AI аватар слева от пузырька, у user - справа.
        if (role === 'user') {
            wrap.appendChild(bubble);
            wrap.appendChild(avatar);
        } else {
            wrap.appendChild(avatar);
            wrap.appendChild(bubble);
        }

        this.els.scroll.appendChild(wrap);
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            try { lucide.createIcons(); } catch (e) {}
        }
        this._scrollBottom();
        if (!opts.typing) {
            AppState.chat.messages.push({ role, body, ready: !!opts.ready });
            // Обрезаем историю в памяти + DOM чтобы при long-session не тормозил слабый Android.
            const MAX_CHAT_MESSAGES = 200;
            if (AppState.chat.messages.length > MAX_CHAT_MESSAGES) {
                const extra = AppState.chat.messages.length - MAX_CHAT_MESSAGES;
                AppState.chat.messages.splice(0, extra);
                while (this.els.scroll.children.length > MAX_CHAT_MESSAGES && this.els.scroll.firstChild) {
                    this.els.scroll.removeChild(this.els.scroll.firstChild);
                }
            }
        }
        return wrap;
    },
    _removeTyping() {
        const t = this.els.scroll && this.els.scroll.querySelector('[data-typing="1"]');
        if (t) t.remove();
    },
    _syncQuoteCta() {
        if (!this.els.cta) return;
        const hasReady = AppState.chat.messages.some(m => m.role === 'ai' && m.ready);
        this.els.cta.hidden = !hasReady || !AppState.chat.session_id;
    },
    async send() {
        if (AppState.chat.sending) return;
        const msg = (this.els.input.value || '').trim();
        if (!msg) return;
        haptic();
        AppState.chat.sending = true;
        this.els.send.disabled = true;
        this.els.input.disabled = true;
        this.addMessage('user', msg);
        this.els.input.value = '';
        this._autoresize();
        this.addMessage('ai', '', { typing: true });

        const chatLang = tg?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru';
        const result = await submitToApi('ai-chat', {
            text: msg,
            session_id: AppState.chat.session_id,
            lang: chatLang,
        });
        this._removeTyping();

        if (result.ok) {
            const d = result.data || {};
            AppState.chat.session_id = d.session_id || AppState.chat.session_id;
            this.addMessage('ai', d.text || '', { ready: !!d.ready_for_quote });
            if (d.ready_for_quote) this._syncQuoteCta();
        } else {
            const isEn = getUserLang() === 'en';
            let key = 'common.error';
            let fallback = isEn ? 'Something went wrong. Please try again.' : 'Что-то пошло не так. Попробуйте ещё раз.';
            if (result.error === 'blocked_injection') {
                key = 'ai.blocked_injection';
                fallback = isEn ? "Request not recognized. Describe the task in plain words." : 'Запрос не распознан. Опишите задачу обычными словами.';
            } else if (result.error === 'retry_later') {
                key = 'ai.retry_later';
                fallback = isEn ? 'AI is temporarily overloaded, try again in 5-15 minutes.' : 'AI временно перегружен, попробуйте через 5-15 минут.';
            } else if (result.error === 'ai_disabled') {
                key = 'ai.disabled';
                fallback = isEn ? 'AI is unavailable right now, message me directly.' : 'AI сейчас недоступен, напишите напрямую.';
            } else if (result.error && String(result.error).startsWith('rate_limit:')) {
                key = 'ai.rate_limit';
                fallback = isEn ? "Too many questions. Let's continue later or message me directly." : 'Слишком много вопросов. Продолжим позже или напишите напрямую.';
            }
            this.addMessage('ai', text(key, fallback), { error: true, icon: 'triangle-alert' });
        }

        AppState.chat.sending = false;
        this.els.send.disabled = false;
        this.els.input.disabled = false;
        this.els.input.focus();
    },
    async submitQuote() {
        if (!AppState.chat.session_id || this.els.ctaBtn.disabled) return;
        haptic('success');
        this.els.ctaBtn.disabled = true;
        const result = await submitToApi('ai-chat-submit-quote', {
            session_id: AppState.chat.session_id,
        });
        if (result.ok) {
            this.els.cta.hidden = true;
            this.addMessage('ai', text('chat.quote_sent',
                'Заявка передана. Свяжусь с вами в ближайшее время.'),
                { success: true, icon: 'check-circle-2' });
        } else {
            this.els.ctaBtn.disabled = false;
            showToast(text('common.error', 'Не удалось отправить'), { type: 'error' });
        }
    },
};


/* === Home Page === */

const HomePage = {
    _inited: false,
    _bannerPollInterval: null,
    cleanup() {
        if (HomePage._bannerPollInterval) {
            clearInterval(HomePage._bannerPollInterval);
            HomePage._bannerPollInterval = null;
        }
        HomePage._inited = false;
    },
    init() {
        if (HomePage._inited) return;
        HomePage._inited = true;

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

        HomePage.refreshActiveRequestBanner();
        if (HomePage._bannerPollInterval) clearInterval(HomePage._bannerPollInterval);
        HomePage._bannerPollInterval = setInterval(() => HomePage.refreshActiveRequestBanner(), 30000);

        document.getElementById('quickQuestionSend').addEventListener('click', async () => {
            haptic();
            const input = document.getElementById('quickQuestionInput');
            const sendBtn = document.getElementById('quickQuestionSend');
            const msg = input.value.trim();
            if (!msg) {
                input.classList.add("input--error");
                showToast(text("common.field_required", "Заполните это поле, пожалуйста"), { type: "info", duration: 2000 });
                setTimeout(() => input.classList.remove("input--error"), 1500);
                return;
            }
            if (sendBtn.disabled) return;

            sendBtn.disabled = true;
            sendBtn.setAttribute('aria-busy', 'true');

            const result = await submitToApi('quick-question', { text: msg });

            sendBtn.disabled = false;
            sendBtn.removeAttribute('aria-busy');

            if (result.ok) {
                const success = leadSuccessCopy();
                input.value = '';
                showToast(success.short, {
                    type: 'success',
                    duration: 3200,
                });
                return;
            }

            showRequestError(text('miniapp_ui.request_error_quick', 'Не удалось отправить вопрос. Напишите мне напрямую, чтобы не потерять обращение.'));
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
        const successBox = document.getElementById('bookingSuccess');
        const successTitle = document.getElementById('bookingSuccessTitle');
        const successBody = document.getElementById('bookingSuccessBody');
        const resetBtn = document.getElementById('bookingReset');

        const today = new Date();
        const minDate = today.toISOString().split('T')[0];
        const maxDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split('T')[0];
        dateInput.min = minDate;
        dateInput.max = maxDate;

        document.getElementById('bookingOpenBtn').addEventListener('click', () => {
            haptic();
            banner.classList.add('fade-hidden');
            form.classList.add('fade-visible');
        });

        const tgUser = tg?.initDataUnsafe?.user;
        if (tgUser?.first_name || tgUser?.username) {
            nameInput.value = tgUser.first_name || tgUser.username || '';
        }

        const dateHint = document.getElementById('bookingDateHint');

        function checkFormReady() {
            submitBtn.disabled = !(dateInput.value && nameInput.value.trim());
            if (dateInput.value) {
                dateHint.classList.add('booking-form__date-hint--hidden');
                dateInput.classList.add('booking-form__date-input--filled');
            } else {
                dateHint.classList.remove('booking-form__date-hint--hidden');
                dateInput.classList.remove('booking-form__date-input--filled');
            }
        }
        nameInput.addEventListener('input', checkFormReady);
        dateInput.addEventListener('input', checkFormReady);
        dateInput.addEventListener('change', checkFormReady);
        checkFormReady();

        function resetBookingForm() {
            dateInput.value = '';
            nameInput.value = tgUser?.first_name || tgUser?.username || '';
            taskInput.value = '';
            successBox.classList.add('booking-form__done--hidden');
            form.classList.add('fade-visible');
            submitBtn.textContent = text('waitlist.webapp_submit', 'Отправить бронь');
            checkFormReady();
        }

        resetBtn.addEventListener('click', () => {
            haptic();
            resetBookingForm();
        });

        submitBtn.addEventListener('click', async () => {
            haptic();
            submitBtn.disabled = true;
            submitBtn.textContent = text('waitlist.webapp_sending', 'Отправляю...');
            const startDate = dateInput.value;
            const result = await submitToApi('waitlist', {
                start_date: startDate,
                client_name: nameInput.value.trim(),
                task: taskInput.value.trim(),
            });

            if (!result.ok) {
                submitBtn.textContent = text('waitlist.webapp_submit', 'Отправить бронь');
                checkFormReady();
                showRequestError(text('miniapp_ui.request_error_waitlist', 'Не удалось отправить бронь. Напишите мне напрямую, и я сам зафиксирую дату.'));
                return;
            }

            const success = leadSuccessCopy();
            successTitle.textContent = success.title;
            successBody.textContent = success.body;
            form.classList.remove('fade-visible');
            successBox.classList.remove('booking-form__done--hidden');
        });
    },

    async refreshActiveRequestBanner() {
        const banner = document.getElementById('activeRequestBanner');
        if (!banner) return;
        try {
            const initData = tg?.initData || '';
            if (!initData) { banner.classList.add('active-request-banner--hidden'); return; }
            const resp = await fetch(`${API_URL}/api/my-active-request?initData=${encodeURIComponent(initData)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
            if (!resp.ok) { banner.classList.add('active-request-banner--hidden'); return; }
            const body = await resp.json();
            const data = body.data || body;
            const req = data.request;
            if (!req) { banner.classList.add('active-request-banner--hidden'); return; }

            const answered = !!req.answered_at;
            const breached = !!req.sla_breached;
            const nowServer = data.server_time || (Date.now() / 1000);

            // Автоскрытие: после answered прошло 30+ минут - баннер больше не актуален.
            // Клиент уже увидел ответ в чате бота.
            const AUTO_HIDE_AFTER_ANSWERED = 30 * 60; // 30 минут
            if (answered && req.answered_at && (nowServer - req.answered_at) > AUTO_HIDE_AFTER_ANSWERED) {
                banner.classList.add('active-request-banner--hidden');
                return;
            }

            // Ручное скрытие - клиент нажал крестик. Храним в localStorage TTL на 30 мин.
            const HIDE_TTL_MS = 30 * 60 * 1000;
            const hideKey = `banner_hidden_${req.id}`;
            try {
                const hidden = parseInt(localStorage.getItem(hideKey) || '0', 10);
                if (hidden && (Date.now() - hidden) < HIDE_TTL_MS) {
                    banner.classList.add('active-request-banner--hidden');
                    return;
                } else if (hidden) {
                    localStorage.removeItem(hideKey);
                }
            } catch (e) {}

            let icon = '⏱';
            let title = text('sla.status_waiting', 'Ожидает прочтения');
            let subtitle = text('sla.timer_hint', 'Отвечу за час');
            if (answered) {
                icon = '✅';
                title = text('sla.status_read', 'Прочитано, ответ скоро');
                subtitle = text('sla.title', 'Статус обращения');
            } else if (breached) {
                icon = '🎁';
                title = text('sla.status_breached', 'Превышен срок');
                subtitle = text('sla.compensated_code', 'Вам выдан промокод');
            } else if (req.sla_deadline) {
                const remaining = Math.max(0, req.sla_deadline - nowServer);
                const mins = Math.ceil(remaining / 60);
                subtitle = mins > 0 ? `~${mins} мин` : text('sla.guarantee_hint', '-5% если не отвечу');
            }

            // Кнопку "Скрыть" показываем только после того как Даниил ответил -
            // до этого момента баннер-таймер полезен и не стоит его прятать.
            const showCloseBtn = answered;

            banner.innerHTML = `
                <div class="active-request-banner__icon">${icon}</div>
                <div class="active-request-banner__body">
                    <div class="active-request-banner__title">${escapeHtml(title)}</div>
                    <div class="active-request-banner__subtitle">${escapeHtml(subtitle)}</div>
                </div>
                ${showCloseBtn
                    ? `<button class="active-request-banner__close" type="button" aria-label="${escapeHtml(text('sla.hide_banner', 'Скрыть'))}"><i data-lucide="x"></i></button>`
                    : `<div class="active-request-banner__arrow">→</div>`}
            `;
            banner.classList.remove('active-request-banner--hidden');
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                try { lucide.createIcons(); } catch (e) {}
            }

            banner.onclick = (ev) => {
                // Клик на крестик - скрываем баннер на 30 мин, не переходим на Status.
                if (ev.target && ev.target.closest('.active-request-banner__close')) {
                    ev.stopPropagation();
                    haptic();
                    try { localStorage.setItem(hideKey, String(Date.now())); } catch (e) {}
                    banner.classList.add('active-request-banner--hidden');
                    return;
                }
                haptic();
                Router.navigate('status');
                StatusPage.load(req.id);
            };
        } catch (e) {
            banner.classList.add('active-request-banner--hidden');
        }
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
                <button class="btn btn--primary tariff-detail__cta" data-tariff-quiz="${tariff.id}">${escapeHtml(labelText('services.order', 'Обсудить проект'))}</button>
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
        return pickPlural(
            n,
            'miniapp_ui.plural_tariff_one',
            'miniapp_ui.plural_tariff_few',
            'miniapp_ui.plural_tariff_many',
            { one: 'тариф', few: 'тарифа', many: 'тарифов', en: 'tariff', enMany: 'tariffs' }
        );
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
    try { localStorage.setItem('favorites', JSON.stringify(AppState.favorites)); } catch (e) {}
    PortfolioPage.updateFavoritesCount();
}

const PortfolioPage = {
    _filtersBound: false,
    _eventsBound: false,
    _videoObserver: null,

    bootstrap() {
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
            empty.classList.add('empty-state--visible');
            return;
        }

        empty.classList.remove('empty-state--visible');
        feed.innerHTML = items.map(item => {
            const isFav = AppState.favorites.includes(item.id);
            const media = this.renderMedia(item);

            return `
                <article class="portfolio-item animate-in" data-pf-id="${escapeHtml(String(item.id || ''))}">
                    ${media}
                    <div class="portfolio-item__body">
                        <h3 class="portfolio-item__title">${escapeHtml(item.title)}</h3>
                        ${item.description ? `<p class="portfolio-item__desc">${nl2br(escapeHtml(item.description))}</p>` : ''}
                        <div class="portfolio-item__actions-row">
                            ${item.url ? `
                                <button class="portfolio-item__btn" data-open-url="${escapeHtml(item.url)}">
                                    <i data-lucide="external-link"></i>
                                    ${escapeHtml(labelText('portfolio.open_site', 'Открыть сайт'))}
                                </button>
                            ` : ''}
                            <button class="portfolio-item__btn portfolio-item__btn--fav ${isFav ? 'portfolio-item__btn--fav-active' : ''}" data-fav-id="${escapeHtml(String(item.id || ''))}">
                                <i data-lucide="heart"></i>
                                ${escapeHtml(text(isFav ? 'portfolio.favorites_added' : 'portfolio.favorites_add', isFav ? 'В избранном' : 'В избранное'))}
                            </button>
                        </div>
                        <button class="portfolio-item__btn portfolio-item__btn--order" data-pf-quiz>
                            <i data-lucide="message-square"></i>
                            ${escapeHtml(labelText('portfolio.discuss_similar', 'Обсудить похожий проект'))}
                        </button>
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
        if (this._videoObserver) {
            this._videoObserver.disconnect();
            this._videoObserver = null;
        }
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
        this._videoObserver = observer;
    },

    renderMedia(item) {
        if (!item.image) return '';

        if (isVideoUrl(item.image)) {
            return `<video class="portfolio-item__media" data-src="${escapeHtml(item.image)}" muted loop playsinline preload="none"></video>`;
        }

        return `<img class="portfolio-item__media" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" width="800" height="450" loading="lazy">`;
    },

    initEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;
        document.getElementById('portfolio-feed').addEventListener('click', e => {
            if (e.target.closest('[data-pf-quiz]')) {
                haptic();
                Router.navigate('quiz');
                return;
            }

            const urlBtn = e.target.closest('[data-open-url]');
            if (urlBtn) {
                haptic();
                const url = urlBtn.dataset.openUrl;
                if (tg?.openLink) { tg.openLink(url); }
                else { window.open(url, '_blank', 'noopener,noreferrer'); }
                return;
            }

            const favBtn = e.target.closest('[data-fav-id]');
            if (!favBtn) return;
            haptic();

            const id = parseInt(favBtn.dataset.favId, 10);
            if (isNaN(id)) return;
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
        badge.textContent = count ? `❤️ ${count}` : '';
        badge.classList.toggle('page__badge--visible', !!count);
    },

    initFilters() {
        if (this._filtersBound) return;
        this._filtersBound = true;
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
            landing: { title: 'Лендинг', hint: 'Одностраничный сайт', titleKey: 'calculator.type_landing', hintKey: 'calculator.type_landing_hint' },
            card: { title: 'Сайт-визитка', hint: '2-5 страниц', titleKey: 'calculator.type_card', hintKey: 'calculator.type_card_hint' },
            corporate: { title: 'Корпоративный сайт', hint: 'Полноценный сайт компании', titleKey: 'calculator.type_corporate', hintKey: 'calculator.type_corporate_hint' },
            shop: { title: 'Интернет-магазин', hint: 'Каталог, корзина, оплата', titleKey: 'calculator.type_shop', hintKey: 'calculator.type_shop_hint' },
        };
        Object.entries(typeFallbacks).forEach(([type, cfg]) => {
            setCalcText(`[data-type="${type}"] .option__text strong`, this.getTypeLabel(type) || text(cfg.titleKey, cfg.title));
            setCalcText(`[data-type="${type}"] .option__text small`, text(this.TYPE_HINT_KEYS[type] || cfg.hintKey, cfg.hint));
            setCalcText(
                `[data-type="${type}"] .option__price`,
                `${text('calculator.from_prefix', 'от')} ${formatCompactRub(this.getTypeBasePrice(type))}`,
            );
        });

        const pageFallbacks = {
            '1_3': { key: 'calculator.pages_1_3', fb: '1-3 страницы' },
            '4_7': { key: 'calculator.pages_4_7', fb: '4-7 страниц' },
            '8_15': { key: 'calculator.pages_8_15', fb: '8-15 страниц' },
            '15plus': { key: 'calculator.pages_15plus', fb: '15+ страниц' },
        };
        Object.entries(pageFallbacks).forEach(([value, cfg]) => {
            setCalcText(`[data-pages="${value}"] .option__text strong`, this.getPagesLabel(value) || text(cfg.key, cfg.fb));
        });

        const designFallbacks = {
            ready: { key: 'calculator.design_ready', fb: 'Есть готовый макет' },
            examples: { key: 'calculator.design_examples', fb: 'Есть примеры / референсы' },
            needed: { key: 'calculator.design_needed', fb: 'Нужен дизайн с нуля' },
        };
        Object.entries(designFallbacks).forEach(([value, cfg]) => {
            setCalcText(`[data-design="${value}"] .option__text strong`, this.getDesignLabel(value) || text(cfg.key, cfg.fb));
        });

        Object.entries(this.FEATURE_TEXT_KEYS).forEach(([value, key]) => {
            setCalcText(`[data-feature="${value}"]`, text(key, value));
        });

        setCalcText('.calc-step__next[data-next]', text('common.next_label', 'Далее'));

        setCalcText('[data-timeline="standard"] .option__text strong', this.getTimelineLabel('standard') || text('calculator.timeline_standard', 'Стандартные сроки'));
        setCalcText('[data-timeline="urgent"] .option__text strong', this.getTimelineLabel('urgent') || text('calculator.timeline_urgent', 'Срочно (1-2 недели)'));
        const urgentMultiplier = DATA.calculator?.urgencyMultiplier?.urgent || 1.5;
        setCalcText(
            '[data-timeline="urgent"] .option__text small',
            interpolateText(text('calculator.timeline_urgent_note', 'x{x} к стоимости'), { x: urgentMultiplier }),
        );

        setCalcText('.calc-result__title', text('calculator.webapp_title', 'Предварительный расчет'));
        setCalcText('.calc-result__note', text('calculator.webapp_result_note', 'Это ориентировочная оценка. Точную цену назову после короткого разговора о деталях.'));
        setCalcText('#calcSubmitBtn', labelText('calculator.to_quiz', 'Обсудить проект'));
        setCalcText('#calcPdfBtn', text('calculator.pdf_btn', 'Скачать PDF'));
        setCalcText('#calcShareBtn', text('calculator.share_btn', 'Поделиться'));
        setCalcText('#calcRestartBtn', text('calculator.restart', 'Пересчитать'));
        setCalcText('.calc-attach-check__label', text('calculator.attach_check_label', 'Прикрепить расчёт и PDF к заявке'));
    },

    init() {
        const backBtn = document.getElementById('calcBackBtn');
        backBtn.classList.toggle('calc-back--visible', AppState.calculator.history.length > 1);

        const progress = document.getElementById('calcProgressBar');
        const currentStep = AppState.calculator.history[AppState.calculator.history.length - 1];
        if (typeof currentStep === 'number') {
            progress.style.width = (currentStep / this.TOTAL_STEPS * 100) + '%';
        }
    },

    goToStep(stepNum) {
        if (stepNum === 'result') {
            document.getElementById('calcProgressBar').style.width = '100%';
            this.loadPromosAndProceed();
            return;
        }

        document.querySelectorAll('.calc-step').forEach(s => s.classList.remove('calc-step--active'));

        const target = document.querySelector(`[data-calc-step="${stepNum}"]`);
        if (target) target.classList.add('calc-step--active');

        const backBtn = document.getElementById('calcBackBtn');
        backBtn.classList.toggle('calc-back--visible', stepNum !== 1);

        const progress = (stepNum / this.TOTAL_STEPS) * 100;
        document.getElementById('calcProgressBar').style.width = progress + '%';

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
        backBtn.classList.toggle('calc-back--visible', prev !== 1);

        if (typeof prev === 'number') {
            const progress = (prev / this.TOTAL_STEPS) * 100;
            document.getElementById('calcProgressBar').style.width = progress + '%';
        } else {
            document.getElementById('calcProgressBar').style.width = '100%';
        }
    },

    calculatePrice() {
        const calc = DATA.calculator;
        const st = AppState.calculator;

        let base = calc.basePrices[st.type] || 25000;
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
        const rate = DATA.calculator.usdRate || 85;
        const usd = Math.round(amount / rate);
        return `${rub} (~$${usd})`;
    },

    applyPromoInflation(baseMin, baseMax, discount) {
        if (!discount || discount <= 0 || discount >= 100) {
            return { inflMin: baseMin, inflMax: baseMax, finMin: baseMin, finMax: baseMax };
        }
        const factor = 100 / (100 - discount);
        const inflMin = Math.round(baseMin * factor / 100) * 100;
        const inflMax = Math.round(baseMax * factor / 100) * 100;
        const finMin = Math.round(inflMin * (100 - discount) / 100 / 100) * 100;
        const finMax = Math.round(inflMax * (100 - discount) / 100 / 100) * 100;
        return { inflMin, inflMax, finMin, finMax };
    },

    async loadPromosAndProceed() {
        const st = AppState.calculator;
        st.appliedPromo = null;
        st.appliedSla = null;
        st.availablePromos = [];
        st.offeredSla = null;

        const initData = tg?.initData;
        if (initData) {
            try {
                const resp = await fetch(
                    `${API_URL}/api/calc-available-promos?initData=${encodeURIComponent(initData)}`
                );
                if (resp.ok) {
                    const json = await resp.json();
                    const data = json.data || json;
                    st.availablePromos = data.items || [];
                    st.offeredSla = data.sla || null;
                }
            } catch (e) { /* network error - proceed without promos */ }
        }

        if (st.availablePromos.length > 0) {
            this.showPromoPick();
        } else {
            this._showResultStep();
        }
    },

    showPromoPick() {
        const st = AppState.calculator;
        const promos = st.availablePromos;
        const sla = st.offeredSla;

        const container = document.querySelector('[data-calc-step="promo"]');
        if (!container) return this._showResultStep();

        let html = `<div class="calc-promo-pick">
            <h2 class="calc-promo-pick__title">${escapeHtml(text('calculator.promo_pick_title', 'Применить промокод?'))}</h2>
            <p class="calc-promo-pick__body">${escapeHtml(text('calculator.promo_pick_body', 'Выберите промокод или продолжите без него.'))}</p>
            <div class="calc-promo-pick__list">`;

        promos.forEach(p => {
            const label = interpolateText(
                text('calculator.promo_apply_btn', '-{discount}% ({code})'),
                { discount: p.discount_percent, code: p.promo_code }
            );
            html += `<button class="calc-promo-pick__item" data-promo-id="${p.promo_id}" data-from-activation="${p.from_activation}">
                <span class="calc-promo-pick__icon">🎁</span>
                <span class="calc-promo-pick__label">${escapeHtml(label)}</span>
            </button>`;
        });

        html += `</div>
            <button class="btn btn--secondary calc-promo-pick__skip">${escapeHtml(text('calculator.promo_skip_btn', 'Без промокода'))}</button>
        </div>`;

        container.innerHTML = html;

        container.querySelectorAll('[data-promo-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                this.pickPromo(parseInt(btn.dataset.promoId), btn.dataset.fromActivation === 'true');
            });
        });

        container.querySelector('.calc-promo-pick__skip')?.addEventListener('click', () => {
            haptic();
            this.pickNoPromo();
        });

        document.querySelectorAll('.calc-step').forEach(s => s.classList.remove('calc-step--active'));
        container.classList.add('calc-step--active');
        st.history.push('promo');

        const backBtn = document.getElementById('calcBackBtn');
        backBtn.classList.toggle('calc-back--visible', true);
    },

    async pickPromo(promoId, fromActivation) {
        const st = AppState.calculator;
        const promo = st.availablePromos.find(p => p.promo_id === promoId);
        if (!promo) return this._showResultStep();

        // Активацию делаем только при отправке заявки (toQuiz),
        // не при выборе - чтобы клиент не "примерял" разные промо на расчёт.
        st.appliedPromo = {
            code: promo.promo_code,
            discount: promo.discount_percent,
            promo_id: promo.promo_id,
            from_activation: fromActivation,
            is_sla: !!promo.is_sla,
        };

        if (st.offeredSla && !promo.is_sla) {
            this.showSlaStack();
        } else {
            this._showResultStep();
        }
    },

    pickNoPromo() {
        // "Без промокода" - сразу к результату, не показываем SLA-стэкинг.
        // SLA уже была одним из пунктов списка - если юзер не выбрал,
        // повторно не навязываем.
        const st = AppState.calculator;
        st.appliedPromo = null;
        st.appliedSla = null;
        this._showResultStep();
    },

    showSlaStack() {
        const st = AppState.calculator;
        const sla = st.offeredSla;
        if (!sla) return this._showResultStep();

        const container = document.querySelector('[data-calc-step="sla-stack"]');
        if (!container) return this._showResultStep();

        const hasPromo = st.appliedPromo && st.appliedPromo.discount > 0;
        const PROMO_MAX = 20;

        let bodyText, yesLabel;
        if (hasPromo) {
            const total = Math.min(st.appliedPromo.discount + sla.discount_percent, PROMO_MAX);
            bodyText = interpolateText(
                text('calculator.sla_stack_body_with_promo',
                    'У вас также активен промокод {sla_code} -{sla_discount}% за долгий ответ. Применить вместе с {code}? Итого -{total}%.'),
                {
                    sla_code: sla.promo_code,
                    sla_discount: sla.discount_percent,
                    code: st.appliedPromo.code,
                    discount: st.appliedPromo.discount,
                    total: total,
                }
            );
            yesLabel = interpolateText(
                text('calculator.sla_stack_yes_btn', 'Да, итого -{total}%'),
                { total: total }
            );
        } else {
            bodyText = interpolateText(
                text('calculator.sla_stack_body_only_sla', 'У вас активен промокод -{sla_discount}% за долгий ответ. Применить?'),
                { sla_discount: sla.discount_percent }
            );
            yesLabel = interpolateText(
                text('calculator.sla_stack_yes_btn', 'Да, итого -{total}%'),
                { total: sla.discount_percent }
            );
        }

        container.innerHTML = `<div class="calc-promo-pick">
            <h2 class="calc-promo-pick__title">${escapeHtml(text('calculator.sla_stack_title', 'Суммировать промокоды?'))}</h2>
            <p class="calc-promo-pick__body">${bodyText}</p>
            <button class="btn btn--primary calc-sla-yes">${escapeHtml(yesLabel)}</button>
            <button class="btn btn--secondary calc-sla-no">${escapeHtml(text('calculator.sla_stack_no_btn', 'Нет, оставить как есть'))}</button>
        </div>`;

        container.querySelector('.calc-sla-yes')?.addEventListener('click', () => {
            haptic();
            st.appliedSla = {
                code: sla.promo_code,
                discount: sla.discount_percent,
            };
            this._showResultStep();
        });

        container.querySelector('.calc-sla-no')?.addEventListener('click', () => {
            haptic();
            st.appliedSla = null;
            this._showResultStep();
        });

        document.querySelectorAll('.calc-step').forEach(s => s.classList.remove('calc-step--active'));
        container.classList.add('calc-step--active');
        st.history.push('sla-stack');

        const backBtn = document.getElementById('calcBackBtn');
        backBtn.classList.toggle('calc-back--visible', true);
    },

    _showResultStep() {
        document.querySelectorAll('.calc-step').forEach(s => s.classList.remove('calc-step--active'));
        const target = document.querySelector('[data-calc-step="result"]');
        if (target) target.classList.add('calc-step--active');

        // На экране результата кнопка "Назад" не показывается:
        // нельзя возвращаться к выбору промо и менять цену.
        const backBtn = document.getElementById('calcBackBtn');
        backBtn.classList.toggle('calc-back--visible', false);

        document.getElementById('calcProgressBar').style.width = '100%';
        // history сбрасываем чтобы Telegram BackButton тоже не вернул на promo-pick.
        AppState.calculator.history = ['result'];
        this.showResult();
    },

    showResult() {
        const { min, max } = this.calculatePrice();
        const st = AppState.calculator;
        const PROMO_MAX = 20;

        let totalDiscount = 0;
        if (st.appliedPromo) totalDiscount += st.appliedPromo.discount;
        if (st.appliedSla) totalDiscount += st.appliedSla.discount;
        totalDiscount = Math.min(totalDiscount, PROMO_MAX);

        const priceEl = document.getElementById('calcResultPrice');
        const promoLineEl = document.getElementById('calcPromoLine');
        const oldPriceEl = document.getElementById('calcOldPrice');

        if (totalDiscount > 0) {
            const { inflMin, inflMax, finMin, finMax } = this.applyPromoInflation(min, max, totalDiscount);
            const oldStr = this.formatPrice(inflMin) + ' - ' + this.formatPrice(inflMax);
            const newStr = this.formatPrice(finMin) + ' - ' + this.formatPrice(finMax);

            if (oldPriceEl) {
                oldPriceEl.textContent = oldStr;
                oldPriceEl.classList.add('calc-result__old-price--visible');
            }

            let promoText;
            if (st.appliedPromo && st.appliedSla) {
                promoText = interpolateText(
                    text('calculator.promo_stacked', '{code} (-{discount}%) + {sla_code} (-{sla_discount}%) = -{total}%'),
                    {
                        code: st.appliedPromo.code,
                        discount: st.appliedPromo.discount,
                        sla_code: st.appliedSla.code,
                        sla_discount: st.appliedSla.discount,
                        total: totalDiscount,
                    }
                );
            } else if (st.appliedPromo) {
                promoText = interpolateText(
                    text('calculator.promo_applied', 'Промокод {code} (-{discount}%)'),
                    { code: st.appliedPromo.code, discount: st.appliedPromo.discount }
                );
            } else if (st.appliedSla) {
                promoText = interpolateText(
                    text('calculator.promo_applied', 'Промокод {code} (-{discount}%)'),
                    { code: st.appliedSla.code, discount: st.appliedSla.discount }
                );
            }

            if (promoLineEl) {
                promoLineEl.textContent = promoText;
                promoLineEl.classList.add('calc-result__promo-line--visible');
            }
            priceEl.textContent = newStr;
        } else {
            if (oldPriceEl) oldPriceEl.classList.remove('calc-result__old-price--visible');
            if (promoLineEl) promoLineEl.classList.remove('calc-result__promo-line--visible');
            priceEl.textContent = this.formatPrice(min) + ' - ' + this.formatPrice(max);
        }

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

    async sendPdf() {
        const st = AppState.calculator;
        const initData = tg?.initData;
        if (!initData) return;

        const lang = tg?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru';

        const payload = {
            initData,
            site_type: st.type,
            pages: st.pages,
            design: st.design,
            features: st.features,
            timeline: st.timeline,
            lang,
        };

        if (st.appliedPromo) {
            payload.applied_promo_code = st.appliedPromo.code;
            payload.applied_discount_percent = st.appliedPromo.discount;
        }
        if (st.appliedSla) {
            payload.applied_sla_code = st.appliedSla.code;
            payload.applied_sla_discount = st.appliedSla.discount;
        }

        const pdfBtn = document.getElementById('calcPdfBtn');
        if (pdfBtn) {
            pdfBtn.disabled = true;
            pdfBtn.textContent = text('calculator.pdf_sending', 'Отправляю PDF...');
        }

        try {
            const resp = await fetch(`${API_URL}/api/calc-pdf-send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (resp.ok) {
                if (tg?.showAlert) {
                    tg.showAlert(text('calculator.pdf_sent_alert', 'PDF отправлен в чат с ботом'), () => {
                        tg.close();
                    });
                } else {
                    alert(text('calculator.pdf_sent_alert', 'PDF отправлен в чат с ботом'));
                }
            } else {
                if (tg?.showAlert) {
                    tg.showAlert(text('calculator.pdf_send_error', 'Не удалось отправить PDF.'));
                }
            }
        } catch (e) {
            if (tg?.showAlert) {
                tg.showAlert(text('calculator.pdf_send_error', 'Не удалось отправить PDF.'));
            }
        } finally {
            if (pdfBtn) {
                pdfBtn.disabled = false;
                pdfBtn.textContent = text('calculator.pdf_btn', 'Скачать PDF');
            }
        }
    },

    shareResult() {
        const lang = tg?.initDataUnsafe?.user?.language_code === 'en' ? 'en' : 'ru';
        const shareText = text(
            'calculator.share_text',
            lang === 'en'
                ? 'Website cost calculator in @yanksweb_bot. Get your quote in 1 minute.'
                : 'Калькулятор стоимости сайта в @yanksweb_bot. Получите расчет за 1 минуту.'
        );
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/yanksweb_bot')}&text=${encodeURIComponent(shareText)}`;
        if (tg?.openTelegramLink) {
            tg.openTelegramLink(shareUrl);
        } else if (tg?.openLink) {
            tg.openLink(shareUrl);
        } else {
            window.open(shareUrl, '_blank', 'noopener,noreferrer');
        }
    },

    async toQuiz() {
        const { max } = this.calculatePrice();
        const budget = max <= 25000 ? '25'
            : max <= 45000 ? '45'
            : max <= 70000 ? '70'
            : max <= 150000 ? '150'
            : '300';

        const featureMap = {
            forms: 'forms',
            crm: 'integrations',
            catalog: 'catalog',
            payment: 'payment',
            i18n: 'multilang',
            seo: 'seo',
        };
        const designMap = {
            ready: 'yes',
            needed: 'no',
            examples: 'examples',
        };

        const st = AppState.calculator;

        // Активация выбранного промо в момент перехода в квиз. До этого
        // юзер мог выбрать любой промо для просмотра расчёта - но запись
        // в БД создаётся только сейчас, когда клиент идёт оформлять заявку.
        if (st.appliedPromo && !st.appliedPromo.from_activation && tg?.initData) {
            try {
                await fetch(`${API_URL}/api/promo-activate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ promo_id: st.appliedPromo.promo_id, initData: tg.initData }),
                });
            } catch (e) { /* silent */ }
        }

        let promoCode = null;
        if (st.appliedPromo && st.appliedSla) {
            promoCode = `${st.appliedPromo.code} + ${st.appliedSla.code}`;
        } else if (st.appliedPromo) {
            promoCode = st.appliedPromo.code;
        } else if (st.appliedSla) {
            promoCode = st.appliedSla.code;
        }

        const attachCheck = document.getElementById('calcAttachCheck');
        const attachCalc = attachCheck ? attachCheck.checked : false;

        AppState.quiz.prefill = {
            site_type: st.type,
            has_design: designMap[st.design] || null,
            budget,
            features: st.features
                .map(feature => featureMap[feature])
                .filter(Boolean),
            promo_code: promoCode,
            attach_calc: attachCalc,
        };

        if (attachCalc) {
            AppState.quiz.prefill.calc_data = {
                site_type: st.type,
                pages: st.pages,
                design: st.design,
                features: st.features,
                timeline: st.timeline,
                base_min: this.calculatePrice().min,
                base_max: this.calculatePrice().max,
                site_type_label: this._resolveLabel('type', st.type),
                pages_label: this._resolveLabel('pages', st.pages),
                design_label: this._resolveLabel('design', st.design),
                features_labels: st.features.map(f => this._resolveLabel('feature', f)).filter(Boolean),
                timeline_label: this._resolveLabel('timeline', st.timeline),
                promo_code: promoCode,
                discount_percent: st.appliedPromo?.discount || null,
            };
        }

        Router.navigate('quiz');
        QuizPage.startQuiz('quick');
    },

    _resolveLabel(category, value) {
        switch (category) {
            case 'type': return this.getTypeLabel(value) || value;
            case 'pages': return this.getPagesLabel(value) || value;
            case 'design': return this.getDesignLabel(value) || value;
            case 'feature': return this.getFeatureLabel(value) || value;
            case 'timeline': return this.getTimelineLabel(value) || value;
            default: return value;
        }
    },

    reset() {
        AppState.calculator = {
            type: null,
            pages: null,
            design: null,
            features: [],
            timeline: null,
            history: [1],
            availablePromos: [],
            offeredSla: null,
            appliedPromo: null,
            appliedSla: null,
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
            this.toQuiz();
        });

        document.getElementById('calcPdfBtn')?.addEventListener('click', () => {
            haptic();
            this.sendPdf();
        });

        document.getElementById('calcShareBtn')?.addEventListener('click', () => {
            haptic();
            this.shareResult();
        });
    },
};

/* === Reviews Page === */

const ReviewsPage = {
    _headerInited: false,

    _initHeader() {
        if (this._headerInited) return;
        const headerBtn = document.getElementById('reviewsAllHeaderBtn');
        if (!headerBtn) return;
        const textSpan = headerBtn.querySelector('.reviews-header-link__text');
        if (textSpan) textSpan.textContent = text('miniapp_ui.reviews_all', 'Все отзывы');
        headerBtn.addEventListener('click', () => {
            haptic();
            const url = REVIEWS_CHANNEL_URL;
            if (tg?.openTelegramLink) { tg.openTelegramLink(url); }
            else if (tg?.openLink) { tg.openLink(url); }
            else { window.open(url, '_blank', 'noopener,noreferrer'); }
        });
        this._headerInited = true;
    },

    render() {
        this._initHeader();
        const list = document.getElementById('reviews-list');
        const empty = document.getElementById('reviewsEmpty');

        if (!DATA.reviews.length) {
            list.innerHTML = '';
            empty.classList.add('empty-state--visible');
            return;
        }

        empty.classList.remove('empty-state--visible');
        const gotoLabel = escapeHtml(text('miniapp_ui.review_goto', 'Перейти к отзыву'));
        const orderLabel = escapeHtml(text('miniapp_ui.review_order', 'Заказать проект'));
        const viewSiteLabel = escapeHtml(text('miniapp_ui.portfolio_view_site', 'Посмотреть сайт'));

        list.innerHTML = DATA.reviews.map(r => {
            const hasChannelPost = Boolean(r.channel_post_url);
            const hasSite = Boolean(r.url);
            return `
            <div class="review-card animate-in">
                <div class="review-card__header">
                    <strong class="review-card__name">${escapeHtml(r.name || '')}</strong>
                    ${r.company ? `<span class="review-card__company">${escapeHtml(r.company)}</span>` : ''}
                </div>
                <p class="review-card__text">${nl2br(escapeHtml(r.text || ''))}</p>
                ${hasSite ? `<button class="btn btn--ghost review-card__link" data-open-url="${escapeHtml(r.url)}"><i data-lucide="external-link"></i> ${viewSiteLabel}</button>` : ''}
                <div class="review-card__actions">
                    ${hasChannelPost ? `<button class="review-card__mini-btn" data-open-tg="${escapeHtml(r.channel_post_url)}"><i data-lucide="message-square"></i> ${gotoLabel}</button>` : ''}
                    <button class="review-card__mini-btn review-card__mini-btn--accent" data-review-order><i data-lucide="send"></i> ${orderLabel}</button>
                </div>
            </div>
        `;
        }).join('');

        list.querySelectorAll('[data-open-url]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                const url = btn.dataset.openUrl;
                if (tg?.openLink) { tg.openLink(url); }
                else { window.open(url, '_blank', 'noopener,noreferrer'); }
            });
        });

        list.querySelectorAll('[data-open-tg]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                const url = btn.dataset.openTg;
                if (tg?.openTelegramLink) { tg.openTelegramLink(url); }
                else if (tg?.openLink) { tg.openLink(url); }
                else { window.open(url, '_blank', 'noopener,noreferrer'); }
            });
        });

        list.querySelectorAll('[data-review-order]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                Router.navigate('quiz');
            });
        });

        lucide.createIcons();
        animateIn(list);
    },
};

/* === Cases Page === */

const CasesPage = {
    _activeIndex: -1,
    _view: 'list',
    _sliderCleanup: null,

    _cleanupSlider() {
        if (this._sliderCleanup) {
            this._sliderCleanup();
            this._sliderCleanup = null;
        }
    },

    render() {
        if (this._view === 'detail' && this._activeIndex >= 0) {
            this._renderDetail();
        } else {
            this._renderList();
        }
    },

    _renderList() {
        const list = document.getElementById('cases-list');
        const detail = document.getElementById('cases-detail');
        const empty = document.getElementById('casesEmpty');
        const title = document.getElementById('casesTitle');

        detail.classList.remove('fade-visible');
        list.classList.remove('fade-hidden');
        if (title) title.textContent = text('cases.title', 'Кейсы');

        if (!DATA.cases.length) {
            list.innerHTML = '';
            empty.classList.add('empty-state--visible');
            return;
        }
        empty.classList.remove('empty-state--visible');

        const nicheEmoji = (niche, title) => {
            const t = ((niche || '') + ' ' + (title || '')).toLowerCase();
            if (t.includes('футбол') || t.includes('спорт') || t.includes('импульс')) return '\u26bd';
            if (t.includes('сертифик') || t.includes('росэксперт')) return '\ud83d\udccb';
            if (t.includes('архитект') || t.includes('интерьер')) return '\ud83c\udfd7\ufe0f';
            if (t.includes('автопост') || t.includes('saas') || t.includes('elementor')) return '\u26a1';
            if (t.includes('вэд') || t.includes('справочник')) return '\ud83e\udde9';
            if (t.includes('визитк') || t.includes('каталог') || t.includes('компонент')) return '\ud83d\udce6';
            if (t.includes('пивовар') || t.includes('craft') || t.includes('rcraft')) return '\ud83c\udf7a';
            if (t.includes('react') || t.includes('next.js') || t.includes('psycho')) return '\ud83d\udcbb';
            if (t.includes('пауэрбанк') || t.includes('k.go') || t.includes('шеринг')) return '\ud83d\udd0b';
            if (t.includes('seo') || t.includes('аудит') || t.includes('индекс')) return '\ud83d\udcca';
            if (t.includes('медицин') || t.includes('здоров') || t.includes('боли') || t.includes('хирург') || t.includes('барат')) return '\u2695\ufe0f';
            if (t.includes('детейлинг') || t.includes('авто')) return '\ud83d\ude97';
            if (t.includes('обучен') || t.includes('школа') || t.includes('семенов')) return '\ud83c\udf93';
            if (t.includes('магазин') || t.includes('shop') || t.includes('spark') || t.includes('commerce')) return '\ud83d\uded2';
            return '\ud83d\udcbc';
        };

        list.innerHTML = DATA.cases.map((c, i) => {
            const name = escapeHtml((c.title || '').split(' - ')[0].split(' \u2014 ')[0].trim());
            const subtitle = escapeHtml(c.niche || '');
            const timeline = escapeHtml(c.timeline || '');
            const emoji = nicheEmoji(c.niche, c.title);
            const thumb = c.thumb_after || c.thumb_before || c.image_after || c.image_before || '';
            return `<button class="cases-item animate-in" data-case-idx="${i}">
                ${thumb
                    ? `<div class="cases-item__thumb"><img src="${escapeHtml(thumb)}" alt="${escapeHtml(c.title || '')}" width="52" height="52" loading="lazy" decoding="async"></div>`
                    : `<div class="cases-item__emoji">${emoji}</div>`
                }
                <div class="cases-item__info">
                    <span class="cases-item__name">${name}</span>
                    ${subtitle ? `<span class="cases-item__niche">${subtitle}</span>` : ''}
                </div>
                ${timeline ? `<span class="cases-item__badge">${timeline}</span>` : ''}
                <svg class="cases-item__arrow" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>`;
        }).join('');

        list.querySelectorAll('.cases-item').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                this._activeIndex = parseInt(btn.dataset.caseIdx, 10);
                this._view = 'detail';
                this.render();
            });
        });

        lucide?.createIcons?.();
        animateIn(list);
    },

    _renderDetail() {
        this._cleanupSlider();
        const list = document.getElementById('cases-list');
        const detail = document.getElementById('cases-detail');
        const title = document.getElementById('casesTitle');
        const c = DATA.cases[this._activeIndex];
        if (!c) return;

        list.classList.add('fade-hidden');
        detail.classList.add('fade-visible');
        if (title) title.textContent = (c.title || '').split(' - ')[0].split(' — ')[0].trim();

        const hasBefore = !!c.image_before;
        const hasAfter = !!c.image_after;
        const hasBoth = hasBefore && hasAfter;

        let mediaHtml = '';
        if (hasBoth) {
            mediaHtml = `
                <div class="ba-slider" data-ba-slider>
                    <img class="ba-slider__after" src="${escapeHtml(c.image_after)}" alt="After" draggable="false">
                    <div class="ba-slider__before-wrap" style="width:50%">
                        <img class="ba-slider__before" src="${escapeHtml(c.image_before)}" alt="Before" draggable="false">
                    </div>
                    <div class="ba-slider__handle" style="left:50%">
                        <div class="ba-slider__handle-line"></div>
                        <div class="ba-slider__handle-circle">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 4L3 10L7 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 4L17 10L13 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        <div class="ba-slider__handle-line"></div>
                    </div>
                    <span class="ba-slider__label ba-slider__label--before">${escapeHtml(text('cases.before', 'До'))}</span>
                    <span class="ba-slider__label ba-slider__label--after">${escapeHtml(text('cases.after', 'После'))}</span>
                </div>`;
        } else if (hasAfter) {
            mediaHtml = `<div class="case-card__image"><img src="${escapeHtml(c.image_after)}" alt="${escapeHtml(c.title || '')}" width="800" height="450" loading="lazy"></div>`;
        } else if (hasBefore) {
            mediaHtml = `<div class="case-card__image"><img src="${escapeHtml(c.image_before)}" alt="${escapeHtml(c.title || '')}" width="800" height="450" loading="lazy"></div>`;
        }

        const metaParts = [];
        if (c.niche) metaParts.push(escapeHtml(c.niche));
        if (c.stack) metaParts.push(escapeHtml(c.stack));
        if (c.timeline) metaParts.push(escapeHtml(c.timeline));

        const total = DATA.cases.length;
        const idx = this._activeIndex;
        const prevIdx = idx > 0 ? idx - 1 : null;
        const nextIdx = idx < total - 1 ? idx + 1 : null;
        const prevName = prevIdx !== null ? escapeHtml((DATA.cases[prevIdx].title || '').split(' - ')[0].trim()) : '';
        const nextName = nextIdx !== null ? escapeHtml((DATA.cases[nextIdx].title || '').split(' - ')[0].trim()) : '';

        detail.innerHTML = `
            <button class="case-back" id="caseBackBtn">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                ${escapeHtml(text('miniapp_ui.cases_all', 'Все кейсы'))}
            </button>
            <div class="case-nav case-nav--top">
                ${prevIdx !== null ? `<button class="case-nav__btn case-nav__btn--prev" data-go="${prevIdx}"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> ${prevName}</button>` : '<span></span>'}
                <span class="case-nav__counter">${idx + 1} / ${total}</span>
                ${nextIdx !== null ? `<button class="case-nav__btn case-nav__btn--next" data-go="${nextIdx}">${nextName} <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : '<span></span>'}
            </div>
            <div class="case-card animate-in">
                ${mediaHtml}
                <div class="case-card__body">
                    <h3 class="case-card__title">${escapeHtml(c.title || '')}</h3>
                    ${metaParts.length ? `<p class="case-card__meta">${metaParts.join(' - ')}</p>` : ''}
                    ${c.task ? `<div class="case-card__section"><strong>${escapeHtml(text('reviews.task', 'Задача'))}:</strong><p>${nl2br(escapeHtml(c.task))}</p></div>` : ''}
                    ${c.solution ? `<div class="case-card__section"><strong>${escapeHtml(text('reviews.solution', 'Решение'))}:</strong><p>${nl2br(escapeHtml(c.solution))}</p></div>` : ''}
                    ${c.result ? `<div class="case-card__section"><strong>${escapeHtml(text('reviews.result', 'Результат'))}:</strong><p>${nl2br(escapeHtml(c.result))}</p></div>` : ''}
                    ${c.url ? `<button class="btn btn--secondary case-card__link" data-open-url="${escapeHtml(c.url)}">${escapeHtml(labelText('reviews.open_site', 'Открыть сайт'))}</button>` : ''}
                    <button class="btn btn--primary case-card__cta" data-case-quiz>${escapeHtml(labelText('services.order', 'Обсудить проект'))}</button>
                </div>
            </div>
            <div class="case-nav">
                ${prevIdx !== null ? `<button class="case-nav__btn case-nav__btn--prev" data-go="${prevIdx}"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> ${prevName}</button>` : '<span></span>'}
                <span class="case-nav__counter">${idx + 1} / ${total}</span>
                ${nextIdx !== null ? `<button class="case-nav__btn case-nav__btn--next" data-go="${nextIdx}">${nextName} <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : '<span></span>'}
            </div>`;

        document.getElementById('caseBackBtn').addEventListener('click', () => {
            haptic();
            this._cleanupSlider();
            this._view = 'list';
            this.render();
            document.querySelector('[data-page="cases"]')?.scrollTo(0, 0);
        });

        detail.querySelectorAll('[data-open-url]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                const url = btn.dataset.openUrl;
                if (tg?.openLink) { tg.openLink(url); }
                else { window.open(url, '_blank', 'noopener,noreferrer'); }
            });
        });

        detail.querySelector('[data-case-quiz]')?.addEventListener('click', () => {
            haptic();
            Router.navigate('quiz');
        });

        detail.querySelectorAll('[data-go]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                this._activeIndex = parseInt(btn.dataset.go, 10);
                this.render();
            });
        });

        document.querySelector('[data-page="cases"]')?.scrollTo({ top: 0, behavior: 'smooth' });

        if (hasBoth) this._initSlider(detail.querySelector('[data-ba-slider]'));

        animateIn(detail);
    },

    _initSlider(el) {
        this._cleanupSlider();
        if (!el) return;
        const handle = el.querySelector('.ba-slider__handle');
        const beforeWrap = el.querySelector('.ba-slider__before-wrap');
        const beforeImg = el.querySelector('.ba-slider__before');

        const afterImg = el.querySelector('.ba-slider__after');

        const syncSize = () => {
            const w = el.offsetWidth;
            beforeImg.style.width = w + 'px';
        };

        const equalizeHeight = () => {
            el.style.height = '';
            syncSize();
            const w = el.offsetWidth;
            const hA = afterImg.naturalHeight / afterImg.naturalWidth * w;
            const hB = beforeImg.naturalHeight / beforeImg.naturalWidth * w;
            if (hA > 0 && hB > 0 && hA !== hB) {
                el.style.height = Math.min(hA, hB) + 'px';
            }
        };

        let loaded = 0;
        const onImgLoad = () => { if (++loaded >= 2) equalizeHeight(); };
        if (afterImg.complete) loaded++; else afterImg.addEventListener('load', onImgLoad);
        if (beforeImg.complete) loaded++; else beforeImg.addEventListener('load', onImgLoad);
        if (loaded >= 2) equalizeHeight();

        syncSize();
        let resizeTimer;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { syncSize(); equalizeHeight(); }, 150);
        };
        window.addEventListener('resize', onResize);

        let dragging = false;

        const move = (clientX) => {
            const rect = el.getBoundingClientRect();
            let pct = ((clientX - rect.left) / rect.width) * 100;
            pct = Math.max(0, Math.min(100, pct));
            handle.style.left = pct + '%';
            beforeWrap.style.width = pct + '%';
        };

        const onStart = (e) => {
            e.preventDefault();
            dragging = true;
            el.classList.add('ba-slider--dragging');
        };
        const onMove = (e) => {
            if (!dragging) return;
            if (e.cancelable) e.preventDefault();
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            move(x);
        };
        const onEnd = () => {
            dragging = false;
            el.classList.remove('ba-slider--dragging');
        };

        handle.addEventListener('mousedown', onStart);
        handle.addEventListener('touchstart', onStart, { passive: false });
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchend', onEnd);

        el.addEventListener('click', (e) => {
            if (!dragging) move(e.clientX);
        });

        const circle = el.querySelector('.ba-slider__handle-circle');
        const CIRCLE_TOP_DEFAULT = 32;
        const CIRCLE_R = 22;
        const STICKY_OFFSET = 16;

        const setCircleY = (y) => {
            circle.style.transform = `translate(-50%, ${y}px)`;
        };

        const updateCircleSticky = () => {
            const sliderRect = el.getBoundingClientRect();
            const sliderTop = sliderRect.top;
            const sliderBottom = sliderRect.bottom;
            const stickyTop = STICKY_OFFSET;

            if (sliderTop >= stickyTop - CIRCLE_TOP_DEFAULT) {
                setCircleY(CIRCLE_TOP_DEFAULT);
            } else if (sliderBottom - stickyTop - CIRCLE_R * 2 < 0) {
                setCircleY(Math.max(0, sliderRect.height - CIRCLE_R * 2 - 8));
            } else {
                setCircleY(stickyTop - sliderTop);
            }
        };

        let _scrollTick = false;
        const updateCircleStickyThrottled = () => {
            if (_scrollTick) return;
            _scrollTick = true;
            requestAnimationFrame(() => {
                updateCircleSticky();
                _scrollTick = false;
            });
        };
        window.addEventListener('scroll', updateCircleStickyThrottled, { passive: true });
        updateCircleSticky();

        this._sliderCleanup = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchend', onEnd);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', updateCircleStickyThrottled);
            clearTimeout(resizeTimer);
        };
    },
};

/* === FAQ Page === */

const FaqPage = {
    _eventsBound: false,

    render() {
        const list = document.getElementById('faq-list');
        const empty = document.getElementById('faqEmpty');

        if (!DATA.faq.length) {
            list.innerHTML = '';
            empty.classList.add('empty-state--visible');
            return;
        }

        empty.classList.remove('empty-state--visible');
        list.innerHTML = `<div class="accordion">${DATA.faq.map((item, i) => `
            <div class="accordion__item animate-in" data-faq-index="${i}">
                <button class="accordion__header">
                    <span class="accordion__q-icon"><i data-lucide="help-circle"></i></span>
                    <span class="accordion__question">${escapeHtml(item.question || '')}</span>
                    <i data-lucide="chevron-down"></i>
                </button>
                <div class="accordion__body">
                    <div class="accordion__answer">
                        ${nl2br(escapeHtml(item.answer || ''))}
                        <button class="btn btn--primary faq-cta" data-faq-quiz>${escapeHtml(labelText('services.order', 'Обсудить проект'))}</button>
                    </div>
                </div>
            </div>
        `).join('')}</div>`;

        if (!this._eventsBound) {
            list.addEventListener('click', e => {
                if (e.target.closest('[data-faq-quiz]')) {
                    haptic();
                    Router.navigate('quiz');
                    return;
                }
                const header = e.target.closest('.accordion__header');
                if (!header) return;
                haptic();
                const item = header.closest('.accordion__item');
                item.classList.toggle('accordion__item--active');
            });
            this._eventsBound = true;
        }

        lucide.createIcons();
        animateIn(list);
    },
};

/* === Quiz Page === */

const QuizPage = {
    get DESIGN_IRRELEVANT_TYPES() { return DATA?.quiz?.designIrrelevantTypes || []; },

    renderTypeChoice() {
        this.startQuiz('quick');
    },

    startQuiz(type) {
        AppState.quiz.type = type;
        AppState.quiz.answers = {};
        AppState.quiz.currentStep = 0;
        AppState.quiz._favAsked = false;
        AppState.quiz._attachFav = null;
        AppState.quiz._promoAsked = false;
        AppState.quiz._promoApplied = false;

        tg?.enableClosingConfirmation?.();

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
            AppState.quiz.steps = ['site_type', 'has_design', 'budget'];
        } else {
            AppState.quiz.steps = [
                'site_type', 'about', 'features', 'has_design',
                'examples', 'budget_timeline'
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

        if (prefill.has_design) {
            AppState.quiz.answers.has_design = prefill.has_design;
            const idx = AppState.quiz.steps.indexOf('has_design');
            if (idx > -1) AppState.quiz.steps.splice(idx, 1);
        }

        if (Array.isArray(prefill.features) && prefill.features.length) {
            AppState.quiz.answers.features = prefill.features;
            const idx = AppState.quiz.steps.indexOf('features');
            if (idx > -1) AppState.quiz.steps.splice(idx, 1);
        }

        this.renderStep();
    },

    renderStep() {
        const step = AppState.quiz.steps[AppState.quiz.currentStep];
        if (!step) {
            if (AppState.quiz.type === 'detailed') {
                this.submit();
            } else {
                this.renderConfirm();
            }
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
                    text('quiz.placeholder_contact', 'Имя, Telegram или телефон'),
                    'contact'
                );
                break;

            case 'about':
                content = this.renderTextStep(
                    text('quiz.q_about', 'Расскажите о проекте'),
                    text('quiz.placeholder_about', 'Чем занимается компания, для чего сайт...'),
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
                    text('quiz.q_examples', 'Есть сайты, которые нравятся? Пришлите ссылки или нажмите «Пропустить»:'),
                    text('quiz.placeholder_examples', 'Ссылки или описание (можно пропустить)'),
                    'examples',
                    true
                );
                break;

            case 'budget_timeline':
                content = this.renderTextStep(
                    text('quiz.q_budget_timeline', 'Бюджет и сроки'),
                    text('quiz.placeholder_budget_timeline', 'Примерный бюджет и когда нужен сайт'),
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

        if (this._pendingBind) {
            this._pendingBind(container);
            this._pendingBind = null;
        }

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

        this._pendingBind = (container) => {
            container.querySelectorAll('.quiz-option[data-quiz-value]').forEach(btn => {
                btn.addEventListener('click', () => {
                    haptic();
                    AppState.quiz.answers[key] = btn.dataset.quizValue;

                    if (key === 'site_type') {
                        const isIrrelevant = this.DESIGN_IRRELEVANT_TYPES.includes(btn.dataset.quizValue);
                        const dIdx = AppState.quiz.steps.indexOf('has_design');
                        if (isIrrelevant && dIdx > -1) {
                            AppState.quiz.steps.splice(dIdx, 1);
                        } else if (!isIrrelevant && dIdx === -1) {
                            const insertAfter = AppState.quiz.steps.indexOf('site_type');
                            AppState.quiz.steps.splice(insertAfter + 1, 0, 'has_design');
                        }
                    }

                    btn.closest('.quiz-options').querySelectorAll('.quiz-option').forEach(o => o.classList.remove('quiz-option--selected'));
                    btn.classList.add('quiz-option--selected');
                    setTimeout(() => this.nextStep(), 250);
                });
            });
        };

        return `<h2 class="quiz-step__title">${escapeHtml(title)}</h2><div class="quiz-options">${items}</div>`;
    },

    renderMultiSelect(title, options, key) {
        const items = options.map(opt => `
            <button class="chip" data-quiz-chip="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</button>
        `).join('');

        this._pendingBind = (container) => {
            const selected = [];

            container.querySelectorAll('[data-quiz-chip]').forEach(chip => {
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

            container.querySelector('[data-quiz-next]')?.addEventListener('click', () => {
                haptic();
                this.nextStep();
            });
        };

        return `
            <h2 class="quiz-step__title">${escapeHtml(title)}</h2>
            <div class="quiz-chips">${items}</div>
            <button class="btn btn--primary quiz-next" data-quiz-next>${escapeHtml(text('common.next_label', 'Далее'))}</button>
        `;
    },

    renderTextStep(title, placeholder, key, skippable) {
        this._pendingBind = (container) => {
            const input = container.querySelector('[data-quiz-text]');
            const sendBtn = container.querySelector('[data-quiz-send]');
            const skipBtn = container.querySelector('[data-quiz-skip]');

            sendBtn?.addEventListener('click', () => {
                haptic();
                const val = input.value.trim();
                if (!val && !skippable) {
                    input.classList.add("input--error");
                    showToast(text("common.field_required", "Заполните это поле, пожалуйста"), { type: "info", duration: 2000 });
                    setTimeout(() => input.classList.remove("input--error"), 1500);
                    return;
                }
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
        };

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
            // Detailed quiz: submit directly, no confirm screen
            if (AppState.quiz.type === 'detailed') {
                this.submit();
            } else {
                this.renderConfirm();
            }
        } else {
            this.renderStep();
        }
    },

    prevStep() {
        if (AppState.quiz.currentStep > 0) {
            AppState.quiz.currentStep--;
            this.renderStep();
        }
    },

    renderConfirm() {
        const container = document.getElementById('quiz-content');
        const isQuick = AppState.quiz.type === 'quick';
        container.innerHTML = `
            <div class="quiz-step animate-in">
                <div class="quiz-done__icon"><i data-lucide="file-text"></i></div>
                <h2 class="quiz-step__title">${escapeHtml(text('quiz.ready_to_send', 'Спасибо за ответы! Хотите сразу отправить заявку или добавить подробности о проекте?'))}</h2>
                <div class="quiz-confirm-actions">
                    <button class="btn btn--primary" id="quizConfirmSend"><i data-lucide="send"></i> ${escapeHtml(text('quiz.send_request', 'Отправить заявку'))}</button>
                    ${isQuick ? `<button class="btn btn--secondary" id="quizConfirmDetailed"><i data-lucide="pencil"></i> ${escapeHtml(text('quiz.describe_more', 'Добавить подробности'))}</button>` : ''}
                </div>
            </div>
        `;
        lucide.createIcons();
        document.getElementById('quizConfirmSend').addEventListener('click', () => {
            haptic();
            this.submit();
        });
        document.getElementById('quizConfirmDetailed')?.addEventListener('click', () => {
            haptic();
            AppState.quiz.type = 'detailed';
            const existing = AppState.quiz.steps.slice();
            const detailedExtras = ['about', 'features', 'budget_timeline'].filter(s => !existing.includes(s));
            AppState.quiz.steps = [...existing, ...detailedExtras];
            if (Array.isArray(AppState.quiz.answers.features) && AppState.quiz.answers.features.length) {
                AppState.quiz.steps = AppState.quiz.steps.filter(s => s !== 'features');
            }
            AppState.quiz.currentStep = existing.length;
            this.renderStep();
        });
    },

    renderSubmitState(container, state) {
        if (state === 'sending') {
            container.innerHTML = `
                <div class="quiz-done quiz-done--pending">
                    <div class="quiz-done__icon quiz-done__icon--spin"><i data-lucide="loader-circle"></i></div>
                    <h2 class="quiz-done__title">${escapeHtml(text('miniapp_ui.quiz_sending_title', 'Отправляю заявку...'))}</h2>
                    <p class="quiz-done__text">${escapeHtml(text('miniapp_ui.quiz_sending_body', 'Подождите пару секунд, проверяю и сохраняю данные.'))}</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        if (state === 'success') {
            const success = quizSuccessCopy();
            const hasPromos = DATA.promos && DATA.promos.length > 0;
            const appliedNotice = AppState.quiz._promoApplied
                ? `<p class="quiz-done__promo-applied">✅ ${escapeHtml(text('quiz.thank_you_promo', 'Ваш промокод применён - я зафиксирую скидку при обсуждении деталей.'))}</p>`
                : '';
            const promoCta = AppState.quiz._promoApplied ? '' : (hasPromos
                ? `<button class="btn btn--primary" data-quiz-promo><i data-lucide="tag"></i> ${escapeHtml(text('quiz.have_promo', 'Хотите скидку?'))}</button>`
                : '');
            container.innerHTML = `
                <div class="quiz-done">
                    <div class="quiz-done__icon"><i data-lucide="check-circle"></i></div>
                    <h2 class="quiz-done__title">${escapeHtml(success.title)}</h2>
                    <p class="quiz-done__text">${escapeHtml(success.body)}</p>
                    ${appliedNotice}
                    <div class="quiz-done__actions">
                        ${promoCta}
                        <button class="btn btn--secondary" data-quiz-home><i data-lucide="home"></i> ${escapeHtml(text('common.home', 'На главную'))}</button>
                    </div>
                </div>
            `;

            container.querySelector('[data-quiz-promo]')?.addEventListener('click', () => {
                haptic();
                Router.navigate('promos');
            });
            container.querySelector('[data-quiz-home]')?.addEventListener('click', () => {
                haptic();
                Router.navigate('home');
            });
            lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <div class="quiz-done quiz-done--error">
                <div class="quiz-done__icon"><i data-lucide="triangle-alert"></i></div>
                <h2 class="quiz-done__title">${escapeHtml(text('miniapp_ui.quiz_error_title', 'Не удалось отправить заявку'))}</h2>
                <p class="quiz-done__text">${escapeHtml(text('miniapp_ui.quiz_error_body', 'Попробуйте ещё раз или напишите мне напрямую - разберёмся.'))}</p>
                <div class="quiz-done__actions">
                    <button class="btn btn--primary" data-quiz-contact>${escapeHtml(text('contact.write', 'Написать мне'))}</button>
                    <button class="btn btn--secondary" data-quiz-retry>${escapeHtml(text('miniapp_ui.quiz_error_retry', 'Повторить'))}</button>
                    <button class="btn btn--ghost quiz-done__home" data-quiz-home>${escapeHtml(text('common.home', 'На главную'))}</button>
                </div>
            </div>
        `;

        container.querySelector('[data-quiz-contact]')?.addEventListener('click', () => {
            haptic();
            openDirectContact();
        });
        container.querySelector('[data-quiz-retry]')?.addEventListener('click', () => {
            haptic();
            this.submit();
        });
        container.querySelector('[data-quiz-home]')?.addEventListener('click', () => {
            haptic();
            Router.navigate('home');
        });
        lucide.createIcons();
    },

    renderPromoApplyPrompt(container, items) {
        const titleLbl = text('promo.apply_prompt_title', 'У вас есть активные промокоды');
        const bodyLbl  = text('promo.apply_prompt_body', 'Применить скидку к заявке?');
        const applyLbl = text('promo.apply_btn', 'Применить');
        const skipLbl  = text('promo.skip_btn', 'Пропустить');

        const cards = items.map((a, idx) => {
            const title = escapeHtml(a.promo_title_ru || a.promo_title_en || a.title || '');
            const code = escapeHtml(a.promo_code || '');
            return `
                <label class="quiz-promo-card">
                    <input type="radio" name="applyPromo" value="${code}" ${idx === 0 ? 'checked' : ''}>
                    <div class="quiz-promo-card__body">
                        <strong>${title}</strong>
                        <code>${code}</code>
                    </div>
                </label>`;
        }).join('');

        container.innerHTML = `
            <div class="quiz-step animate-in">
                <div class="quiz-done__icon"><i data-lucide="tag"></i></div>
                <h2 class="quiz-step__title">${escapeHtml(titleLbl)}</h2>
                <p class="quiz-fav-hint">${escapeHtml(bodyLbl)}</p>
                <div class="quiz-promo-list">${cards}</div>
                <button class="btn btn--primary quiz-next" id="promoApplyYes">${escapeHtml(applyLbl)}</button>
                <button class="btn btn--secondary quiz-skip" id="promoApplyNo">${escapeHtml(skipLbl)}</button>
            </div>
        `;
        lucide.createIcons();

        container.querySelectorAll('.quiz-promo-card input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                container.querySelectorAll('.quiz-promo-card').forEach(c => c.classList.remove('quiz-promo-card--checked'));
                radio.closest('.quiz-promo-card')?.classList.add('quiz-promo-card--checked');
            });
            if (radio.checked) radio.closest('.quiz-promo-card')?.classList.add('quiz-promo-card--checked');
        });

        document.getElementById('promoApplyYes').addEventListener('click', () => {
            haptic();
            const selected = container.querySelector('input[name="applyPromo"]:checked');
            if (selected) {
                AppState.quiz.answers.promo_code = selected.value;
                AppState.quiz._promoApplied = true;
            }
            this.submit();
        });
        document.getElementById('promoApplyNo').addEventListener('click', () => {
            haptic();
            this.submit();
        });
    },

    renderPromoActivatePrompt(container, promos) {
        const titleLbl = text('promo.auto_title', '🎁 Для вас есть скидка!');
        const bodyLbl  = text('promo.auto_body', 'Активируйте промокод прямо сейчас и получите скидку на разработку.');
        const applyLbl = text('promo.auto_activate_btn', 'Активировать и применить');
        const skipLbl  = text('promo.skip_btn', 'Пропустить');

        const cards = promos.map((p, idx) => {
            const title = escapeHtml(p.title_ru || p.title_en || p.title || '');
            return `
                <label class="quiz-promo-card">
                    <input type="radio" name="activatePromo" value="${p.id}" ${idx === 0 ? 'checked' : ''}>
                    <div class="quiz-promo-card__body">
                        <strong>${title}</strong>
                        <code>${escapeHtml(p.promo_code || '')}</code>
                    </div>
                </label>`;
        }).join('');

        container.innerHTML = `
            <div class="quiz-step animate-in">
                <div class="quiz-done__icon"><i data-lucide="gift"></i></div>
                <h2 class="quiz-step__title">${escapeHtml(titleLbl)}</h2>
                <p class="quiz-fav-hint">${escapeHtml(bodyLbl)}</p>
                <div class="quiz-promo-list">${cards}</div>
                <button class="btn btn--primary quiz-next" id="promoActivateYes">${escapeHtml(applyLbl)}</button>
                <button class="btn btn--secondary quiz-skip" id="promoActivateNo">${escapeHtml(skipLbl)}</button>
            </div>
        `;
        lucide.createIcons();

        container.querySelectorAll('.quiz-promo-card input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                container.querySelectorAll('.quiz-promo-card').forEach(c => c.classList.remove('quiz-promo-card--checked'));
                radio.closest('.quiz-promo-card')?.classList.add('quiz-promo-card--checked');
            });
            if (radio.checked) radio.closest('.quiz-promo-card')?.classList.add('quiz-promo-card--checked');
        });

        document.getElementById('promoActivateYes').addEventListener('click', async () => {
            haptic();
            const selected = container.querySelector('input[name="activatePromo"]:checked');
            if (selected && tg?.initData) {
                try {
                    const res = await fetch(`${API_URL}/api/promo-activate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ promo_id: parseInt(selected.value), initData: tg.initData }),
                    });
                    const json = await res.json();
                    const code = json?.activation?.promo_code || json?.data?.activation?.promo_code;
                    if (code) {
                        AppState.quiz.answers.promo_code = code;
                        AppState.quiz._promoApplied = true;
                    }
                } catch (e) {
                    haptic('error');
                    const isEn = (typeof getUserLang === 'function') && getUserLang() === 'en';
                    const fb = isEn ? 'Connection lost, please try again' : 'Нет связи, попробуйте ещё раз';
                    const msg = (typeof text === 'function')
                        ? text('miniapp_ui.promo_connection_error', fb)
                        : fb;
                    showToast(msg, { type: 'error' });
                }
            }
            this.submit();
        });
        document.getElementById('promoActivateNo').addEventListener('click', () => {
            haptic();
            this.submit();
        });
    },

    async submit() {
        const container = document.getElementById('quiz-content');

        // If user has favorites and hasn't been asked yet, show attach prompt
        if (AppState.favorites.length && !AppState.quiz._favAsked) {
            AppState.quiz._favAsked = true;
            const favItems = DATA.portfolio.filter(p => AppState.favorites.includes(p.id));
            if (favItems.length) {
                const count = favItems.length;
                const lastTwo = count % 100;
                const lastOne = count % 10;
                let wordKey = 'miniapp_ui.plural_work_many';
                let wordFallback = 'работ';
                if (lastTwo < 11 || lastTwo > 14) {
                    if (lastOne === 1) { wordKey = 'miniapp_ui.plural_work_one'; wordFallback = 'работу'; }
                    else if (lastOne >= 2 && lastOne <= 4) { wordKey = 'miniapp_ui.plural_work_few'; wordFallback = 'работы'; }
                }
                const word = text(wordKey, wordFallback);
                const bodyTemplate = text('miniapp_ui.fav_attach_body', 'Вы сохранили {count} {word}. Прикрепить к заявке?');
                const body = interpolateText(bodyTemplate, { count, word });
                container.innerHTML = `
                    <div class="quiz-step animate-in">
                        <h2 class="quiz-step__title">${escapeHtml(text('miniapp_ui.fav_attach_title', 'Прикрепить понравившиеся работы?'))}</h2>
                        <p class="quiz-fav-hint">${escapeHtml(body)}</p>
                        <div class="quiz-fav-list">
                            ${favItems.map(p => `<div class="quiz-fav-item">❤️ ${escapeHtml(p.title)}</div>`).join('')}
                        </div>
                        <button class="btn btn--primary quiz-next" id="favAttachYes">${escapeHtml(text('miniapp_ui.fav_attach_yes', 'Да, прикрепить'))}</button>
                        <button class="btn btn--secondary quiz-skip" id="favAttachNo">${escapeHtml(text('miniapp_ui.fav_attach_no', 'Нет, отправить без них'))}</button>
                    </div>
                `;
                document.getElementById('favAttachYes').addEventListener('click', () => {
                    haptic();
                    AppState.quiz._attachFav = true;
                    this.submit();
                });
                document.getElementById('favAttachNo').addEventListener('click', () => {
                    haptic();
                    AppState.quiz._attachFav = false;
                    this.submit();
                });
                return;
            }
        }

        if (!AppState.quiz._promoAsked && tg?.initData) {
            AppState.quiz._promoAsked = true;
            try {
                const res = await fetch(
                    `${API_URL}/api/promo-activations?initData=${encodeURIComponent(tg.initData)}`
                );
                const json = await res.json();
                const items = (json?.items || json?.data?.items || [])
                    .filter(a => a.expires_at && (a.seconds_left == null || a.seconds_left > 0));
                if (items.length) {
                    this.renderPromoApplyPrompt(container, items);
                    return;
                }
            } catch (e) { /* network error - silent */ }

            // No active activations - check if there are promos available to activate
            try {
                const res = await fetch(
                    `${API_URL}/api/promos?initData=${encodeURIComponent(tg.initData)}`
                );
                const json = await res.json();
                const available = (json?.items || json?.data?.items || [])
                    .filter(p => !p.is_eternal && !p.user_activation);
                if (available.length) {
                    this.renderPromoActivatePrompt(container, available);
                    return;
                }
            } catch (e) { /* network error - silent */ }
        }

        this.renderSubmitState(container, 'sending');
        const payload = {
            quiz_type: AppState.quiz.type,
            ...AppState.quiz.answers,
        };

        if (AppState.quiz._attachFav !== false && AppState.favorites.length) {
            const favItems = DATA.portfolio.filter(p => AppState.favorites.includes(p.id));
            payload.favorites = favItems.map(p => p.title).join(', ');
        }

        // Attach calculator data if user opted in
        const prefill = AppState.quiz.prefill || {};
        if (prefill.attach_calc && prefill.calc_data) {
            payload.attach_calc = true;
            payload.calc_data = prefill.calc_data;
        }

        const result = await submitToApi('quiz-submit', payload);

        AppState.quiz.prefill = null;

        if (result.ok) {
            tg?.disableClosingConfirmation?.();
            this.renderSubmitState(container, 'success');
            return;
        }

        this.renderSubmitState(container, 'error');
        showRequestError(text('miniapp_ui.quiz_error_direct', 'Не удалось отправить заявку. Напишите мне напрямую, чтобы не потерять проект.'));
    },
};

/* === Favorites Page === */

const FavoritesPage = {
    render() {
        const container = document.getElementById('favoritesContent');
        if (!container) return;

        const favIds = AppState.favorites;
        if (!favIds.length) {
            container.innerHTML = `
                <div class="empty-state empty-state--inline">
                    <div class="empty-state__icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></div>
                    <p class="empty-state__title">${escapeHtml(text('miniapp_ui.fav_empty_title', 'Избранное пусто'))}</p>
                    <p>${escapeHtml(text('miniapp_ui.fav_empty_body', 'Здесь вы сможете сохранять понравившиеся работы из портфолио и прикрепить их к заявке. Нажмите ❤️ на любом проекте в разделе «Работы».'))}</p>
                    <button class="btn btn--primary" data-navigate="portfolio">${escapeHtml(text('miniapp_ui.fav_empty_cta', 'Перейти в портфолио'))}</button>
                </div>
            `;
            container.querySelector('[data-navigate]')?.addEventListener('click', () => { haptic(); Router.navigate('portfolio'); });
            return;
        }

        const items = DATA.portfolio.filter(p => favIds.includes(p.id));
        if (!items.length) {
            container.innerHTML = `<div class="empty-state"><p>${escapeHtml(text('miniapp_ui.fav_deleted', 'Работы были удалены из портфолио'))}</p></div>`;
            return;
        }

        container.innerHTML = `
            <p class="favorites-hint">${escapeHtml(text('miniapp_ui.fav_attach_hint', 'Понравившиеся работы будут прикреплены к заявке как пример желаемого результата.'))}</p>
            <div class="favorites-list">
                ${items.map(item => `
                    <div class="favorites-item" data-fav-item="${item.id}">
                        <div class="favorites-item__info">
                            <strong>${escapeHtml(item.title)}</strong>
                            ${item.url ? `<span class="favorites-item__url">${escapeHtml(item.url)}</span>` : ''}
                        </div>
                        <button class="favorites-item__remove" data-remove-fav="${item.id}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="favorites-actions">
                <button class="btn btn--primary" id="favQuizBtn">${escapeHtml(text('miniapp_ui.fav_attach_continue', 'Обсудить проект'))}</button>
            </div>
        `;

        container.querySelectorAll('[data-remove-fav]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                const id = parseInt(btn.dataset.removeFav, 10);
                if (isNaN(id)) return;
                AppState.favorites = AppState.favorites.filter(f => f !== id);
                try { localStorage.setItem('favorites', JSON.stringify(AppState.favorites)); } catch (e) {}
                PortfolioPage?.updateFavoritesCount?.();
                this.render();
            });
        });

        document.getElementById('favQuizBtn')?.addEventListener('click', () => {
            haptic();
            Router.navigate('quiz');
        });
    },
};

/* === Status Page (SLA timer) === */

const StatusPage = {
    _requestId: null,
    _tickInterval: null,
    _pollInterval: null,
    _state: null,
    _clockSkew: 0,

    cleanup() {
        if (this._tickInterval) clearInterval(this._tickInterval);
        if (this._pollInterval) clearInterval(this._pollInterval);
        this._tickInterval = null;
        this._pollInterval = null;
    },

    async load(requestId) {
        this.cleanup();
        this._requestId = requestId;
        this._state = null;
        this._renderLoading();
        await this._fetch();
        if (!this._state) return;
        this._renderStatus();
        this._startTick();
        this._startPolling();
    },

    async _fetch() {
        try {
            const initData = tg?.initData || '';
            const resp = await fetch(`${API_URL}/api/request-status/${this._requestId}?initData=${encodeURIComponent(initData)}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
            });
            if (!resp.ok) {
                this._renderError(resp.status);
                return;
            }
            const body = await resp.json();
            this._state = body.data || body;
            if (typeof this._state.server_time === 'number') {
                this._clockSkew = this._state.server_time - (Date.now() / 1000);
            }
        } catch (e) {
            this._renderError(0);
        }
    },

    _now() {
        return (Date.now() / 1000) + this._clockSkew;
    },

    _renderLoading() {
        const container = document.getElementById('statusContent');
        if (!container) return;
        container.innerHTML = `
            <div class="sla-status">
                <div class="sla-status__ring">
                    <svg class="sla-status__svg" viewBox="0 0 220 220">
                        <circle class="sla-status__track" cx="110" cy="110" r="100"/>
                    </svg>
                    <div class="sla-status__center">
                        <div class="sla-status__icon">⏳</div>
                    </div>
                </div>
                <p class="sla-status__message">${escapeHtml(text('miniapp_ui.loader_almost', 'Загружаю статус...'))}</p>
            </div>
        `;
    },

    _renderError(code) {
        const container = document.getElementById('statusContent');
        if (!container) return;
        const msg = code === 404
            ? text('sla.request_not_found', 'Заявка не найдена.')
            : text('miniapp_ui.error_generic', 'Не удалось загрузить данные');
        container.innerHTML = `
            <div class="sla-status">
                <div class="sla-status__icon">⚠️</div>
                <p class="sla-status__message">${escapeHtml(msg)}</p>
                <div class="sla-status__actions">
                    <button class="sla-status__action-btn" data-navigate="home">${escapeHtml(text('menu.home', 'Главная'))}</button>
                </div>
            </div>
        `;
        container.querySelector('[data-navigate="home"]')?.addEventListener('click', () => {
            haptic();
            Router.navigate('home');
        });
    },

    _computeView() {
        const s = this._state;
        const deadline = s.sla_deadline;
        const answeredAt = s.answered_at;
        const breached = !!s.sla_breached;
        const code = s.discount_promo_code;

        const hideAt = (breached && deadline) ? (deadline + 24 * 3600) : null;

        if (answeredAt) {
            return { kind: 'answered', answeredAt, code: breached ? code : null, hideAt };
        }
        if (breached && code) {
            return { kind: 'breached', code, hideAt };
        }
        if (!deadline) {
            return { kind: 'off_hours' };
        }
        const now = this._now();
        const remaining = deadline - now;
        const total = 3600;
        const elapsed = Math.max(0, total - remaining);
        const progress = Math.min(1, Math.max(0, elapsed / total));
        if (remaining <= 0) {
            return { kind: 'expired', progress: 1 };
        }
        return { kind: 'countdown', remaining, progress };
    },

    _formatTime(seconds) {
        const safe = Math.max(0, Math.floor(seconds));
        const mm = String(Math.floor(safe / 60)).padStart(2, '0');
        const ss = String(safe % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    },

    _renderStatus() {
        const container = document.getElementById('statusContent');
        if (!container) return;
        const view = this._computeView();
        const CIRC = 628.32;

        if (view.kind === 'answered') {
            const dt = new Date(view.answeredAt * 1000);
            const time = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            container.innerHTML = `
                <div class="sla-status">
                    <div class="sla-status__ring">
                        <svg class="sla-status__svg" viewBox="0 0 220 220">
                            <circle class="sla-status__track" cx="110" cy="110" r="100"/>
                            <circle class="sla-status__progress sla-status__progress--answered" cx="110" cy="110" r="100" stroke-dashoffset="0"/>
                        </svg>
                        <div class="sla-status__center">
                            <div class="sla-status__icon">✅</div>
                        </div>
                    </div>
                    <span class="sla-status__badge sla-status__badge--success">${escapeHtml(text('sla.status_read', 'Прочитано, ответ скоро'))}</span>
                    <p class="sla-status__message">${escapeHtml(text('sla.already_answered_at', 'Ответ получен в {time}').replace('{time}', time))}</p>
                    ${view.code ? this._renderCodeBox(view.code, view.hideAt) : ''}
                    ${this._renderActions()}
                </div>
            `;
        } else if (view.kind === 'breached') {
            container.innerHTML = `
                <div class="sla-status">
                    <div class="sla-status__ring">
                        <svg class="sla-status__svg" viewBox="0 0 220 220">
                            <circle class="sla-status__track" cx="110" cy="110" r="100"/>
                            <circle class="sla-status__progress sla-status__progress--breached" cx="110" cy="110" r="100" stroke-dashoffset="0"/>
                        </svg>
                        <div class="sla-status__center">
                            <div class="sla-status__icon">🎁</div>
                        </div>
                    </div>
                    <span class="sla-status__badge sla-status__badge--breached">${escapeHtml(text('sla.status_breached', 'Превышен срок'))}</span>
                    ${this._renderCodeBox(view.code, view.hideAt)}
                    ${this._renderActions()}
                </div>
            `;
        } else if (view.kind === 'off_hours') {
            container.innerHTML = `
                <div class="sla-status">
                    <div class="sla-status__ring">
                        <svg class="sla-status__svg" viewBox="0 0 220 220">
                            <circle class="sla-status__track" cx="110" cy="110" r="100"/>
                        </svg>
                        <div class="sla-status__center">
                            <div class="sla-status__icon">🌙</div>
                            <div class="sla-status__label">${escapeHtml(text('sla.status_waiting', 'Ожидает прочтения'))}</div>
                        </div>
                    </div>
                    <p class="sla-status__message">${escapeHtml(text('sla.timer_off_hours', 'Сейчас вне рабочих часов. Таймер стартует в 9:00 МСК.'))}</p>
                    ${this._renderActions()}
                </div>
            `;
        } else {
            // countdown or expired (waiting for server to issue compensation)
            const dashOffset = (CIRC * view.progress).toFixed(1);
            const remainingSec = view.kind === 'expired' ? 0 : view.remaining;
            const warning = view.kind !== 'expired' && remainingSec < 15 * 60;
            const timeLabel = this._formatTime(remainingSec);
            container.innerHTML = `
                <div class="sla-status">
                    <div class="sla-status__ring">
                        <svg class="sla-status__svg" viewBox="0 0 220 220">
                            <circle class="sla-status__track" cx="110" cy="110" r="100"/>
                            <circle class="sla-status__progress ${warning ? 'sla-status__progress--warning' : ''}"
                                    cx="110" cy="110" r="100"
                                    stroke-dashoffset="${dashOffset}"
                                    id="slaProgressCircle"/>
                        </svg>
                        <div class="sla-status__center">
                            <div class="sla-status__time" id="slaTimeValue">${timeLabel}</div>
                            <div class="sla-status__label">${escapeHtml(text('sla.status_waiting', 'Ожидает прочтения'))}</div>
                        </div>
                    </div>
                    <p class="sla-status__hint">${escapeHtml(text('sla.guarantee_hint', 'Гарантия: -5% промокод если не отвечу за час.'))}</p>
                    ${this._renderActions()}
                </div>
            `;
        }

        container.querySelectorAll('[data-navigate]').forEach(btn => {
            btn.addEventListener('click', () => {
                haptic();
                const target = btn.getAttribute('data-navigate');
                if (target) Router.navigate(target);
            });
        });

        container.querySelectorAll('[data-sla-copy]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const code = btn.getAttribute('data-sla-copy');
                if (!code) return;
                haptic();
                let ok = false;
                try {
                    await navigator.clipboard.writeText(code);
                    ok = true;
                } catch (e) {
                    try {
                        const ta = document.createElement('textarea');
                        ta.value = code;
                        ta.setAttribute('readonly', '');
                        ta.style.position = 'absolute';
                        ta.style.left = '-9999px';
                        document.body.appendChild(ta);
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                        ok = true;
                    } catch (_) { /* fallthrough */ }
                }
                btn.classList.toggle('sla-status__code-box--copied', ok);
                setTimeout(() => btn.classList.remove('sla-status__code-box--copied'), 1600);
                if (ok) {
                    try { tg?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
                }
            });
        });
    },

    _renderCodeBox(code, hideAt) {
        const copyHint = text('sla.copy_hint', 'Нажмите чтобы скопировать');
        const hideLine = hideAt
            ? `<div class="sla-status__code-box-hide" data-sla-hide-at="${hideAt}">${escapeHtml(this._formatHideLeft(hideAt))}</div>`
            : '';
        return `
            <button type="button" class="sla-status__code-box" data-sla-copy="${escapeHtml(code)}" aria-label="${escapeHtml(copyHint)}">
                <div class="sla-status__code-box-label">${escapeHtml(text('promo.your_code', 'Ваш промокод'))}</div>
                <div class="sla-status__code">${escapeHtml(code)}</div>
                <div class="sla-status__code-box-hint">${escapeHtml(copyHint)}</div>
                ${hideLine}
            </button>
        `;
    },

    _formatHideLeft(hideAt) {
        const now = this._now();
        const left = Math.max(0, Math.floor(hideAt - now));
        if (left <= 0) return text('sla.hide_soon', 'Скроется скоро');
        const template = text('sla.hide_timer', 'Меню закроется через {time}');
        return template.replace('{time}', formatHourMin(left));
    },

    _renderActions() {
        const homeLabel = text('menu.home', 'Главная');
        const portfolioLabel = text('menu.portfolio', 'Портфолио');
        return `
            <div class="sla-status__actions">
                <button class="sla-status__action-btn sla-status__action-btn--secondary" data-navigate="portfolio">${escapeHtml(portfolioLabel)}</button>
                <button class="sla-status__action-btn" data-navigate="home">${escapeHtml(homeLabel)}</button>
            </div>
        `;
    },

    _startTick() {
        if (this._tickInterval) clearInterval(this._tickInterval);
        this._tickInterval = setInterval(() => this._tick(), 1000);
    },

    _startPolling() {
        if (this._pollInterval) clearInterval(this._pollInterval);
        this._pollInterval = setInterval(async () => {
            const prevAnswered = this._state?.answered_at;
            const prevBreached = this._state?.sla_breached;
            await this._fetch();
            if (!this._state) return;
            const changed = this._state.answered_at !== prevAnswered || this._state.sla_breached !== prevBreached;
            if (changed) {
                this._renderStatus();
                if (this._state.answered_at || this._state.sla_breached) {
                    this.cleanup();
                    try { tg?.HapticFeedback?.notificationOccurred('success'); } catch (e) {}
                }
            }
        }, 10000);
    },

    _tick() {
        if (!this._state) return;
        document.querySelectorAll('[data-sla-hide-at]').forEach(el => {
            const hideAt = parseFloat(el.getAttribute('data-sla-hide-at'));
            if (hideAt) el.textContent = this._formatHideLeft(hideAt);
        });
        const view = this._computeView();
        if (view.kind !== 'countdown' && view.kind !== 'expired') return;
        const timeEl = document.getElementById('slaTimeValue');
        const progressEl = document.getElementById('slaProgressCircle');
        if (!timeEl || !progressEl) return;
        const CIRC = 628.32;
        const remaining = view.kind === 'expired' ? 0 : view.remaining;
        timeEl.textContent = this._formatTime(remaining);
        progressEl.setAttribute('stroke-dashoffset', (CIRC * view.progress).toFixed(1));
        if (view.kind !== 'expired' && remaining < 15 * 60) {
            progressEl.classList.add('sla-status__progress--warning');
        }
        if (view.kind === 'expired') {
            // Ждём polling который через API подтянет sla_breached=1 + code
            progressEl.classList.remove('sla-status__progress--warning');
            progressEl.classList.add('sla-status__progress--breached');
        }
    },
};

/* === Audit Page === */

/* Fallback-словарь SEO-меток. В проде приходят через text() из БД
   (ключи seo_report.check_name_*). Эти значения - на случай если БД недоступна. */
const SEO_CHECK_FALLBACKS = {
    title: 'Title страницы',
    meta_description: 'Meta Description',
    h1: 'Заголовок H1',
    heading_hierarchy: 'Иерархия заголовков',
    img_alt: 'Alt у изображений',
    open_graph: 'Open Graph разметка',
    canonical: 'Canonical URL',
    robots_txt: 'robots.txt',
    sitemap: 'Sitemap.xml',
    ssl: 'SSL-сертификат',
    https_redirect: 'HTTPS-редирект',
    www_consistency: 'WWW-консистентность',
    mixed_content: 'Смешанный контент',
    favicon: 'Favicon',
    viewport: 'Viewport',
    noindex: 'Индексация',
    json_ld: 'Структурированные данные',
    ttfb: 'Время ответа сервера',
    hreflang: 'Hreflang',
    last_modified: 'Last-Modified',
    privacy_policy: 'Политика конфиденциальности',
    lang_charset: 'Lang и Charset',
};

function seoCheckName(id) {
    return text(`seo_report.check_name_${id}`, SEO_CHECK_FALLBACKS[id] || id);
}

const SEO_CATEGORY_FALLBACKS = {
    meta: 'Мета-теги',
    security: 'Безопасность',
    indexing: 'Индексация',
    content: 'Контент',
    performance: 'Производительность',
    legal: 'Юридическое',
};

function seoCategoryName(cat) {
    return text(`seo_report.category_${cat}`, SEO_CATEGORY_FALLBACKS[cat] || cat);
}

const AuditPage = {
    _running: false,
    _mode: 'seo',

    init() {
        document.getElementById('auditSubmitBtn').addEventListener('click', () => this._submitAudit());
        document.getElementById('auditTabs').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-audit-type]');
            if (!btn || this._running) return;
            haptic();
            const type = btn.dataset.auditType;
            if (type === this._mode) return;
            this._mode = type;
            document.querySelectorAll('.audit-tabs__btn').forEach(b => b.classList.remove('audit-tabs__btn--active'));
            btn.classList.add('audit-tabs__btn--active');
            this.renderForm(document.getElementById('auditBody'));
        });
    },

    _submitAudit() {
        if (this._mode === 'seo') {
            this.runSeoAudit();
        } else {
            this.runSpeedAudit();
        }
    },

    _validateUrl() {
        const input = document.getElementById('auditUrlInput');
        const url = input.value.trim();
        let testUrl = url;
        if (!testUrl.startsWith('http')) testUrl = 'https://' + testUrl;
        try {
            const parsed = new URL(testUrl);
            if (!parsed.hostname.includes('.')) throw new Error();
        } catch {
            input.classList.add('input--error');
            showToast(text('common.enter_valid_url', 'Введите корректный URL'), { type: 'info', duration: 2000 });
            setTimeout(() => input.classList.remove('input--error'), 1500);
            return null;
        }
        return url;
    },

    async runSeoAudit() {
        if (this._running) return;
        haptic();
        const url = this._validateUrl();
        if (!url) return;

        const body = document.getElementById('auditBody');
        this._running = true;
        this._renderLoading(body, url);

        const _res = await submitToApi('seo-audit', { url });
        this._running = false;
        const result = _res.ok
            ? { ok: true, ..._res.data }
            : { ok: false, error: _res.error, ..._res.data };

        if (_res.status === 429 || result.error === 'limit_reached') {
            this._renderLimitReached(body);
            return;
        }
        if (result.ok && result.checks) {
            this.renderSeoResult(body, result);
        } else {
            this._renderError(body, result.error || text('common.error_try_later', 'Ошибка, попробуйте позже'));
        }
    },

    renderSeoResult(container, data) {
        const passed = data.score_passed || 0;
        const total = data.score_total || 1;
        const pct = Math.round((passed / total) * 100);
        const color = pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red';
        const circumference = 2 * Math.PI * 52;
        const offset = circumference - (pct / 100) * circumference;

        const grouped = {};
        (data.checks || []).forEach(c => {
            const cat = c.category || 'meta';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(c);
        });

        let categoriesHtml = '';
        for (const [catKey, catLabel] of Object.entries(SEO_CATEGORIES)) {
            const checks = grouped[catKey];
            if (!checks || !checks.length) continue;
            const passCount = checks.filter(c => c.status === 'pass').length;
            const failCount = checks.filter(c => c.status === 'fail').length;
            const warnCount = checks.filter(c => c.status === 'warn').length;

            let badgeHtml = '';
            if (failCount) badgeHtml += `<span class="seo-badge seo-badge--fail">${failCount}</span>`;
            if (warnCount) badgeHtml += `<span class="seo-badge seo-badge--warn">${warnCount}</span>`;
            badgeHtml += `<span class="seo-badge seo-badge--pass">${passCount}</span>`;

            const checksHtml = checks.map(c => `
                <div class="seo-check">
                    <span class="seo-check__dot seo-check__dot--${c.status}"></span>
                    <div class="seo-check__info">
                        <div class="seo-check__name">${escapeHtml(seoCheckName(c.id))}</div>
                        ${c.detail ? `<div class="seo-check__detail">${escapeHtml(c.detail)}</div>` : ''}
                    </div>
                </div>
            `).join('');

            categoriesHtml += `
                <div class="seo-category">
                    <div class="seo-category__header" data-seo-toggle>
                        <span class="seo-category__title">${escapeHtml(catLabel)}</span>
                        <span class="seo-category__badge">
                            ${badgeHtml}
                            <svg class="seo-category__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </span>
                    </div>
                    <div class="seo-category__checks">
                        <div class="seo-category__checks-inner">${checksHtml}</div>
                    </div>
                </div>
            `;
        }

        let multiHtml = '';
        if (data.multi_page_issues && data.multi_page_issues.length) {
            multiHtml = `
                <div class="seo-multi-issues">
                    <div class="seo-multi-issues__title">${escapeHtml(text('miniapp_ui.seo_multi_page', 'Проблемы на нескольких страницах'))}</div>
                    ${data.multi_page_issues.map(i => {
                        const detail = typeof i === 'object' ? (i.detail || JSON.stringify(i)) : String(i);
                        const urls = (typeof i === 'object' && i.urls && i.urls.length)
                            ? `<div class="seo-multi-issue__urls">${i.urls.map(u => `<span>${escapeHtml(u)}</span>`).join('')}</div>`
                            : '';
                        return `<div class="seo-multi-issue">
                            <span class="seo-multi-issue__icon">&#9888;</span>
                            <div class="seo-multi-issue__content">
                                <div class="seo-multi-issue__text">${escapeHtml(detail)}</div>
                                ${urls}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            `;
        }

        const reportUrl = data.report_id ? `https://bot.yanksweb.ru/seo-report/${data.report_id}` : '';

        container.innerHTML = `
            <div class="seo-score">
                <div class="seo-score__circle">
                    <svg viewBox="0 0 120 120">
                        <circle class="seo-score__circle-bg" cx="60" cy="60" r="52"/>
                        <circle class="seo-score__circle-fill seo-score__circle-fill--${color}" cx="60" cy="60" r="52"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${offset}"/>
                    </svg>
                    <div class="seo-score__value seo-score__value--${color}">${passed}/${total}</div>
                </div>
                <div class="seo-score__label">${data.pages_crawled ? escapeHtml(interpolateText(text('miniapp_ui.seo_pages_checked_count', 'Проверено страниц: {n}'), { n: data.pages_crawled })) : escapeHtml(text('miniapp_ui.seo_score_label', 'SEO-оценка'))}</div>
                <div class="seo-score__url">${escapeHtml(data.url || data.domain || '')}</div>
            </div>
            ${categoriesHtml}
            ${multiHtml}
            ${reportUrl ? `
                <button class="seo-share" id="seoShareBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                    ${escapeHtml(text('miniapp_ui.seo_share_btn', 'Поделиться отчётом'))}
                </button>
            ` : ''}
            <div class="audit-result__actions">
                <button class="btn btn--primary" id="seoOrderBtn">${escapeHtml(text('miniapp_ui.seo_cta_order', 'Заказать полный аудит и исправления'))}</button>
                <button class="btn btn--secondary" id="auditRetryBtn">${escapeHtml(text('miniapp_ui.seo_cta_retry', 'Проверить другой'))}</button>
            </div>
            ${data.remaining != null ? `<p class="audit-remaining">${escapeHtml(interpolateText(text('miniapp_ui.seo_quota_left', 'Осталось проверок: {remaining} из {limit}'), { remaining: data.remaining, limit: data.limit || 3 }))}</p>` : ''}
        `;

        container.querySelectorAll('[data-seo-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                haptic();
                header.closest('.seo-category').classList.toggle('seo-category--open');
            });
        });

        document.getElementById('seoShareBtn')?.addEventListener('click', () => {
            haptic();
            if (navigator.clipboard) {
                navigator.clipboard.writeText(reportUrl).then(() => {
                    showToast(text('miniapp_ui.toast_link_copied', 'Ссылка скопирована'), { type: 'success', duration: 2000 });
                }).catch(() => {
                    showToast(text('miniapp_ui.toast_copy_failed', 'Не удалось скопировать'), { type: 'error', duration: 2000 });
                });
            }
        });

        document.getElementById('seoOrderBtn')?.addEventListener('click', () => { haptic(); Router.navigate('quiz'); });
        document.getElementById('auditRetryBtn')?.addEventListener('click', () => { haptic(); this.renderForm(document.getElementById('auditBody')); });
    },

    async runSpeedAudit() {
        if (this._running) return;
        haptic();
        const url = this._validateUrl();
        if (!url) return;

        const body = document.getElementById('auditBody');
        this._running = true;
        this._renderLoading(body, url);

        const _res = await submitToApi('audit', { url });
        this._running = false;
        const result = _res.ok
            ? { ok: true, ..._res.data }
            : { ok: false, error: _res.error, ..._res.data };

        if (_res.status === 429 || result.error === 'limit_reached') {
            this._renderLimitReached(body);
            return;
        }
        if (result.ok && result.metrics) {
            this.renderSpeedResult(body, result);
        } else if (result.audit_error === 'invalid_url') {
            this._renderError(body, text('audit.invalid_url', 'Некорректный URL'));
        } else if (result.ok && result.audit_error === 'pagespeed_failed') {
            this._renderPartial(body, result);
        } else {
            this._renderError(body, result.error || text('audit.webapp_error_note', 'Ошибка, попробуйте позже'));
        }
    },

    _renderLoading(container, url) {
        container.innerHTML = `
            <div class="audit-loading">
                <div class="audit-loading__spinner"></div>
                <p class="audit-loading__text">${escapeHtml(text('audit.loading', 'Анализирую сайт...'))}</p>
                <p class="audit-result__url">${escapeHtml(url)}</p>
            </div>
        `;
    },

    scoreColor(s) { return s >= 90 ? 'green' : s >= 50 ? 'yellow' : 'red'; },

    issueText(key) {
        /* Fallback-значения если ключей нет в БД. В проде tесты приходят через text().
           Ключи в audit_report.* должны быть в bot_texts на ru + en. */
        const m = {
            issue_render_blocking: 'Блокирующие ресурсы',
            issue_optimized_images: 'Изображения не оптимизированы',
            issue_text_compression: 'Нет сжатия текста',
            issue_responsive_images: 'Неадаптивные изображения',
            issue_cache_ttl: 'Короткий срок кеша',
            issue_unminified_css: 'CSS не минифицирован',
            issue_unminified_js: 'JS не минифицирован',
            issue_unused_css: 'Неиспользуемый CSS',
            issue_unused_js: 'Неиспользуемый JS',
            issue_dom_size: 'Слишком большой DOM',
            issue_redirects: 'Лишние редиректы',
            issue_server_response: 'Медленный сервер',
            issue_preconnect: 'Нет preconnect',
            issue_font_display: 'Шрифты блокируют рендер',
            issue_meta_description: 'Нет meta description',
            issue_document_title: 'Нет title',
            issue_image_alt: 'Нет alt у изображений',
            issue_viewport: 'Нет viewport meta',
        };
        return text(`audit_report.${key}`, m[key] || key);
    },

    renderScoreCard(score, label) {
        return `<div class="audit-score-card audit-score-card--${this.scoreColor(score)}">
            <div class="audit-score-card__value">${score}</div>
            <div class="audit-score-card__label">${escapeHtml(label)}</div>
        </div>`;
    },

    renderSpeedResult(container, r) {
        const m = r.metrics;
        const ssl = r.ssl || {};
        const sslOk = ssl.valid === true;
        const issues = m.issues || [];
        const isGood = r.is_good;

        container.innerHTML = `
            <div class="audit-result">
                <p class="audit-result__url">${escapeHtml(r.url || r.domain)}</p>
                <div class="audit-scores">
                    ${this.renderScoreCard(m.performance, text('audit.cat_performance', 'Скорость'))}
                    ${this.renderScoreCard(m.seo, 'SEO')}
                    ${this.renderScoreCard(m.accessibility, text('audit.cat_accessibility', 'Доступность'))}
                    ${this.renderScoreCard(m.best_practices, text('audit.cat_best_practices', 'Практики'))}
                </div>
                <div class="audit-vitals">
                    <div class="audit-vitals__title">Core Web Vitals</div>
                    <div class="audit-vitals__grid">
                        ${m.lcp != null ? `<div class="audit-vital"><span class="audit-vital__name">LCP</span><span class="audit-vital__value">${m.lcp}s</span></div>` : ''}
                        ${m.fcp != null ? `<div class="audit-vital"><span class="audit-vital__name">FCP</span><span class="audit-vital__value">${m.fcp}s</span></div>` : ''}
                        ${m.cls != null ? `<div class="audit-vital"><span class="audit-vital__name">CLS</span><span class="audit-vital__value">${m.cls}</span></div>` : ''}
                        ${m.tbt != null ? `<div class="audit-vital"><span class="audit-vital__name">TBT</span><span class="audit-vital__value">${m.tbt}ms</span></div>` : ''}
                        ${m.speed_index != null ? `<div class="audit-vital"><span class="audit-vital__name">Speed Index</span><span class="audit-vital__value">${m.speed_index}s</span></div>` : ''}
                    </div>
                </div>
                <div class="audit-ssl ${sslOk ? 'audit-ssl--ok' : 'audit-ssl--bad'}">
                    <span class="audit-ssl__icon">${sslOk ? '\ud83d\udd12' : '\u26a0\ufe0f'}</span>
                    <span class="audit-ssl__text">SSL: ${sslOk ? (ssl.days_left ? interpolateText(text('audit_report.ssl_days_left', '{days} дн.'), { days: ssl.days_left }) : text('audit_report.ssl_installed', 'OK')) : text('audit_report.ssl_missing', 'Отсутствует')}</span>
                </div>
                ${issues.length ? `
                <div class="audit-issues">
                    <div class="audit-issues__title">${escapeHtml(text('miniapp_ui.seo_issues_title', 'Найденные проблемы'))} (${issues.length})</div>
                    ${issues.map(i => `<div class="audit-issue">${escapeHtml(this.issueText(i))}</div>`).join('')}
                </div>` : ''}
                <div class="audit-verdict ${isGood ? 'audit-verdict--good' : 'audit-verdict--bad'}">
                    <div class="audit-verdict__icon">${isGood ? '\u2705' : '\u26a0\ufe0f'}</div>
                    <div class="audit-verdict__text">${escapeHtml(isGood ? text('miniapp_ui.seo_all_good', 'Сайт в хорошем состоянии') : text('miniapp_ui.seo_all_good_cta', 'Есть что улучшить - могу помочь!'))}</div>
                </div>
                <div class="audit-result__actions">
                    <button class="btn btn--secondary" id="auditRetryBtn">${escapeHtml(text('miniapp_ui.seo_cta_retry', 'Проверить другой'))}</button>
                    ${!isGood ? `<button class="btn btn--primary" id="auditOrderBtn">${escapeHtml(labelText('services.order', 'Обсудить проект'))}</button>` : ''}
                </div>
                ${r.remaining != null ? `<p class="audit-remaining">${escapeHtml(interpolateText(text('miniapp_ui.seo_quota_left', 'Осталось проверок: {remaining} из {limit}'), { remaining: r.remaining, limit: r.limit || 5 }))}</p>` : ''}
            </div>
        `;
        document.getElementById('auditRetryBtn')?.addEventListener('click', () => { haptic(); this.renderForm(document.getElementById('auditBody')); });
        document.getElementById('auditOrderBtn')?.addEventListener('click', () => { haptic(); Router.navigate('quiz'); });
    },

    _renderPartial(container, r) {
        const ssl = r.ssl || {};
        const sslOk = ssl.valid === true;
        container.innerHTML = `
            <div class="audit-result">
                <p class="audit-result__url">${escapeHtml(r.url || r.domain)}</p>
                <div class="audit-ssl ${sslOk ? 'audit-ssl--ok' : 'audit-ssl--bad'}">
                    <span class="audit-ssl__icon">${sslOk ? '\ud83d\udd12' : '\u26a0\ufe0f'}</span>
                    <span class="audit-ssl__text">SSL: ${sslOk ? text('audit_report.ssl_installed', 'OK') : text('audit_report.ssl_missing', 'Отсутствует')}</span>
                </div>
                <div class="audit-verdict audit-verdict--bad">
                    <div class="audit-verdict__icon">\u26a0\ufe0f</div>
                    <div class="audit-verdict__text">${escapeHtml(text('miniapp_ui.pagespeed_failed', 'Не удалось получить данные PageSpeed'))}</div>
                </div>
                <div class="audit-result__actions">
                    <button class="btn btn--secondary" id="auditRetryBtn">${escapeHtml(text('miniapp_ui.seo_cta_retry', 'Проверить другой'))}</button>
                </div>
            </div>
        `;
        document.getElementById('auditRetryBtn')?.addEventListener('click', () => { haptic(); this.renderForm(document.getElementById('auditBody')); });
    },

    _renderError(container, msg) {
        container.innerHTML = `
            <div class="audit-result">
                <div class="audit-verdict audit-verdict--bad">
                    <div class="audit-verdict__icon">\u274c</div>
                    <div class="audit-verdict__text">${escapeHtml(msg)}</div>
                </div>
                <div class="audit-result__actions">
                    <button class="btn btn--secondary" id="auditRetryBtn">${escapeHtml(text('miniapp_ui.seo_cta_retry', 'Проверить другой'))}</button>
                </div>
            </div>
        `;
        document.getElementById('auditRetryBtn')?.addEventListener('click', () => { haptic(); this.renderForm(document.getElementById('auditBody')); });
    },

    _renderLimitReached(container) {
        container.innerHTML = `
            <div class="audit-result">
                <div class="audit-verdict audit-verdict--bad">
                    <div class="audit-verdict__icon">\u23f3</div>
                    <div class="audit-verdict__text">${escapeHtml(text('miniapp_ui.audit_limit_reached', 'Лимит исчерпан. Попробуйте завтра!'))}</div>
                </div>
            </div>
        `;
    },

    renderForm(container) {
        if (!container) container = document.getElementById('auditBody');
        const descText = this._mode === 'seo'
            ? text('seo_audit.desc', 'Проверю SEO-оптимизацию: мета-теги, индексация, безопасность, структура и юридические требования.')
            : text('audit.desc', 'Укажите адрес сайта - проанализирую скорость, SEO, SSL и мобильность.');
        container.innerHTML = `
            <p class="audit__desc" id="auditDesc">${escapeHtml(descText)}</p>
            <div class="audit__field">
                <input class="input" id="auditUrlInput" type="url" placeholder="https://example.com">
            </div>
            <button class="btn btn--primary audit__submit" id="auditSubmitBtn">${escapeHtml(text('audit.webapp_submit', 'Проверить'))}</button>
        `;
        document.getElementById('auditSubmitBtn').addEventListener('click', () => this._submitAudit());
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

/* === Stack Page === */

const STACK_GROUPS = [
    {
        icon: 'code-2', color: 'blue',
        titleRu: 'Языки программирования', titleEn: 'Languages',
        items: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'PHP', 'Python'],
    },
    {
        icon: 'layout', color: 'purple',
        titleRu: 'Frontend', titleEn: 'Frontend',
        items: ['React', 'Vue', 'Next.js', 'Nuxt', 'Vite', 'Redux'],
    },
    {
        icon: 'palette', color: 'pink',
        titleRu: 'Стили и UI', titleEn: 'Styles & UI',
        items: ['Tailwind', 'SCSS / Sass', 'Less', 'styled-components', 'CSS Modules', 'shadcn/ui', 'Radix UI', 'Headless UI', 'Bootstrap'],
    },
    {
        icon: 'server', color: 'green',
        titleRu: 'Backend', titleEn: 'Backend',
        items: ['Laravel (PHP)', 'Yii (PHP)', 'Node.js', 'Express', 'Next.js API', 'aiogram (Python)', 'aiohttp', 'FastAPI', 'Flask', 'REST API', 'GraphQL'],
    },
    {
        icon: 'database', color: 'orange',
        titleRu: 'Базы данных и BaaS', titleEn: 'Databases & BaaS',
        items: ['MySQL', 'PostgreSQL', 'SQLite', 'Supabase', 'Firebase'],
    },
    {
        icon: 'package', color: 'cyan',
        titleRu: 'CMS', titleEn: 'CMS',
        items: ['WordPress', 'WooCommerce', 'Shopify', 'Bitrix', 'InSales', 'CS-Cart', 'MODX', 'OpenCart', 'Webflow', 'Joomla', 'Drupal'],
    },
    {
        icon: 'terminal', color: 'red',
        titleRu: 'DevOps и инфраструктура', titleEn: 'DevOps & infrastructure',
        items: ['Git', 'GitHub Actions', 'GitLab CI/CD', 'Docker', 'Nginx', 'systemd', 'VPS / Linux'],
    },
    {
        icon: 'cloud', color: 'blue',
        titleRu: 'Хостинг', titleEn: 'Hosting',
        items: ['Beget', 'Timeweb', 'Reg.ru', 'Sprinthost', 'SpaceWeb', 'Vercel', 'Netlify'],
    },
];

const StackPage = {
    _rendered: false,

    render() {
        const container = document.getElementById('stack-content');
        if (!container) return;
        if (this._rendered) return;

        const isEn = getUserLang() === 'en';
        const html = STACK_GROUPS.map(g => {
            const title = escapeHtml(isEn ? g.titleEn : g.titleRu);
            const chips = g.items.map(item => `<span class="stack-chip">${escapeHtml(item)}</span>`).join('');
            return `
                <div class="stack-group">
                    <div class="stack-group__header">
                        <span class="stack-group__icon stack-group__icon--${g.color}"><i data-lucide="${g.icon}"></i></span>
                        <h3 class="stack-group__title">${title}</h3>
                    </div>
                    <div class="stack-group__chips">${chips}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
        if (window.lucide?.createIcons) {
            window.lucide.createIcons({ nodes: [container] });
        }
        this._rendered = true;
    },

    reset() {
        this._rendered = false;
    },
};

/* === Promos Page === */

function pluralDays(n) {
    return pickPlural(
        n,
        'common.days_one', 'common.days_few', 'common.days_many',
        { one: 'день', few: 'дня', many: 'дней', en: 'day', enMany: 'days' }
    );
}

function formatExpiresDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const locale = getUserLang() === 'en' ? 'en-US' : 'ru-RU';
    return d.toLocaleString(locale, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatTimeLeft(seconds) {
    if (!seconds || seconds <= 0) return text('common.expired', 'Истекло');
    if (seconds >= 86400) {
        const days = Math.floor(seconds / 86400);
        return `${days} ${pluralDays(days)}`;
    }
    return formatHourMin(seconds);
}

function getPromoState(promo) {
    const act = promo.user_activation;
    if (!act) return 'available';
    if (act.is_expired) return 'expired';
    if (promo.is_eternal || act.expires_at === null) return 'eternal';
    return 'active';
}

const PromosPage = {
    timers: [],

    async loadUserActivations() {
        if (!tg?.initData) return;
        try {
            const url = `${API_URL}/api/promos?initData=${encodeURIComponent(tg.initData)}`;
            const res = await fetch(url);
            if (!res.ok) return;
            const data = await res.json();
            const items = data?.items || data?.data?.items || [];
            if (!items.length) return;
            items.forEach(serverPromo => {
                const local = DATA.promos.find(p => p.id === serverPromo.id);
                if (local) {
                    local.user_activation = serverPromo.user_activation || null;
                    local.is_eternal = Boolean(serverPromo.is_eternal);
                    local.activation_duration_days = serverPromo.activation_duration_days || null;
                }
            });
        } catch (e) {
            /* network error - silent */
        }
    },

    render() {
        const list = document.getElementById('promos-list');
        const empty = document.getElementById('promosEmpty');

        this._paint(list, empty);

        if (DATA.promos.length && tg?.initData) {
            this.loadUserActivations().then(() => {
                if (AppState.currentPage === 'promos') {
                    this._paint(list, empty);
                }
            }).catch(() => {});
        }
    },

    _paint(list, empty) {
        this.timers.forEach(t => clearInterval(t));
        this.timers = [];

        if (!DATA.promos.length) {
            list.innerHTML = '';
            empty.classList.add('empty-state--visible');
            return;
        }

        empty.classList.remove('empty-state--visible');
        list.innerHTML = DATA.promos.map(promo => this.renderCard(promo)).join('');

        list.querySelectorAll('[data-activate]').forEach(btn => {
            btn.addEventListener('click', () => {
                const promoId = parseInt(btn.dataset.activate, 10);
                haptic();
                this.activatePromo(promoId);
            });
        });

        list.querySelectorAll('[data-copy-code]').forEach(el => {
            el.addEventListener('click', () => {
                const code = el.dataset.copyCode;
                if (!code) return;
                haptic();
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                        showToast(text('miniapp_ui.toast_code_copied', 'Код скопирован'), { type: 'success', duration: 2000 });
                    }).catch(() => {
                        showToast(text('miniapp_ui.toast_copy_failed', 'Не удалось скопировать'), { type: 'error', duration: 2000 });
                    });
                }
            });
        });

        DATA.promos.forEach(promo => {
            const state = getPromoState(promo);
            if (state !== 'active') return;
            const expiresAt = promo.user_activation?.expires_at;
            if (!expiresAt) return;

            const cdEl = list.querySelector(`[data-countdown="${promo.id}"]`);
            if (!cdEl) return;

            const update = () => {
                const now = Date.now();
                const end = new Date(expiresAt).getTime();
                const diff = Math.floor((end - now) / 1000);

                if (diff <= 0) {
                    if (promo.user_activation) promo.user_activation.is_expired = true;
                    this._paint(list, empty);
                    return;
                }
                cdEl.textContent = formatTimeLeft(diff);
            };

            update();
            this.timers.push(setInterval(update, 60000));
        });

        lucide.createIcons();
        animateIn(list);
    },

    renderCard(promo) {
        const state = getPromoState(promo);
        const badge = promo.discount ? `<span class="promo-card__badge">${escapeHtml(promo.discount)}</span>` : '';
        const title = escapeHtml(promo.title || '');
        const textBody = nl2br(escapeHtml(promo.text || ''));
        const code = escapeHtml(promo.code || '');

        const codeLabel = text('promo.promo_code_label', 'Промокод:');
        const eternalLabel = text('miniapp_ui.promo_eternal_active', 'Постоянная акция');
        const activateLabel = text('miniapp_ui.promo_activate_btn', 'Активировать');
        const activeUntilLabel = text('miniapp_ui.promo_active_until', 'Действует до:');
        const expiredTitle = text('miniapp_ui.promo_expired_title', 'Время использования истекло');
        const expiredBody = text('miniapp_ui.promo_expired_body', 'Но не переживайте - скоро появятся новые акции и скидки!');

        const hintText = text('promo.hint', 'Когда я свяжусь с вами, отправьте этот промокод мне в ЛС - я зафиксирую скидку за вами.');
        const hintBlock = `<div class="promo-card__hint"><i data-lucide="message-circle"></i><span>${escapeHtml(hintText)}</span></div>`;

        if (state === 'available') {
            let durationLine = '';
            if (promo.is_eternal) {
                durationLine = eternalLabel;
            } else if (promo.activation_duration_days) {
                const days = promo.activation_duration_days;
                if (days === 1) {
                    durationLine = text('miniapp_ui.promo_activation_duration_one', 'Действует 1 день после активации');
                } else {
                    const template = text('miniapp_ui.promo_activation_duration', 'Действует {days} дней после активации');
                    durationLine = interpolateText(template, { days });
                }
            }
            return `
                <div class="promo-card promo-card--available animate-in">
                    <div class="promo-card__header">
                        ${badge}
                        <h3 class="promo-card__title">${title}</h3>
                    </div>
                    <p class="promo-card__text">${textBody}</p>
                    ${durationLine ? `
                        <div class="promo-card__duration">
                            <i data-lucide="clock"></i>
                            <span>${escapeHtml(durationLine)}</span>
                        </div>
                    ` : ''}
                    <button class="btn btn--primary promo-card__activate" data-activate="${promo.id}">
                        <i data-lucide="zap"></i>
                        <span>${escapeHtml(activateLabel)}</span>
                    </button>
                    ${hintBlock}
                </div>
            `;
        }

        if (state === 'eternal') {
            return `
                <div class="promo-card promo-card--eternal animate-in">
                    <div class="promo-card__header">
                        ${badge}
                        <h3 class="promo-card__title">${title}</h3>
                    </div>
                    <p class="promo-card__text">${textBody}</p>
                    ${code ? `
                        <div class="promo-card__code" data-copy-code="${code}">
                            <span class="promo-card__code-label">${escapeHtml(codeLabel)}</span>
                            <code>${code}</code>
                            <i data-lucide="copy"></i>
                        </div>
                    ` : ''}
                    <div class="promo-card__eternal-badge">
                        <i data-lucide="infinity"></i>
                        <span>${escapeHtml(eternalLabel)}</span>
                    </div>
                    ${hintBlock}
                </div>
            `;
        }

        if (state === 'active') {
            const exp = promo.user_activation?.expires_at;
            const secondsLeft = promo.user_activation?.seconds_left;
            return `
                <div class="promo-card promo-card--active animate-in">
                    <div class="promo-card__header">
                        ${badge}
                        <h3 class="promo-card__title">${title}</h3>
                    </div>
                    <p class="promo-card__text">${textBody}</p>
                    ${code ? `
                        <div class="promo-card__code" data-copy-code="${code}">
                            <span class="promo-card__code-label">${escapeHtml(codeLabel)}</span>
                            <code>${code}</code>
                            <i data-lucide="copy"></i>
                        </div>
                    ` : ''}
                    <div class="promo-card__timer">
                        <div class="promo-card__timer-label">${escapeHtml(activeUntilLabel)}</div>
                        <div class="promo-card__timer-date">${escapeHtml(formatExpiresDate(exp))}</div>
                        <div class="promo-card__countdown" data-countdown="${promo.id}">${escapeHtml(formatTimeLeft(secondsLeft))}</div>
                    </div>
                    ${hintBlock}
                </div>
            `;
        }

        // expired
        return `
            <div class="promo-card promo-card--expired animate-in">
                <div class="promo-card__header">
                    <h3 class="promo-card__title promo-card__title--dim">${title}</h3>
                </div>
                <div class="promo-card__expired-icon"><i data-lucide="clock-x"></i></div>
                <div class="promo-card__expired-title">${escapeHtml(expiredTitle)}</div>
                <p class="promo-card__expired-text">${escapeHtml(expiredBody)}</p>
            </div>
        `;
    },

    async activatePromo(promoId) {
        const activateLabel = text('miniapp_ui.promo_activate_btn', 'Активировать');
        const activatingLabel = text('miniapp_ui.promo_activating', 'Активирую...');
        const btn = document.querySelector(`[data-activate="${promoId}"]`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-circle"></i><span>${escapeHtml(activatingLabel)}</span>`;
            lucide.createIcons();
        }

        const resetBtn = () => {
            if (!btn) return;
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="zap"></i><span>${escapeHtml(activateLabel)}</span>`;
            lucide.createIcons();
        };

        try {
            const res = await fetch(`${API_URL}/api/promo-activate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promo_id: promoId,
                    initData: tg?.initData || ''
                })
            });
            const data = await res.json().catch(() => null);

            const activation = data?.activation || data?.data?.activation;
            if (res.ok && data?.success && activation) {
                const promo = DATA.promos.find(p => p.id === promoId);
                if (promo) {
                    promo.user_activation = {
                        expires_at: activation.expires_at || null,
                        activated_at: activation.activated_at || new Date().toISOString(),
                        is_expired: false,
                        seconds_left: activation.expires_at
                            ? Math.floor((new Date(activation.expires_at).getTime() - Date.now()) / 1000)
                            : null,
                    };
                }
                showToast(text('miniapp_ui.promo_activated_toast', 'Промокод активирован!'), { type: 'success' });
                haptic('success');
                this._paint(document.getElementById('promos-list'), document.getElementById('promosEmpty'));
            } else {
                showToast(data?.error || text('miniapp_ui.promo_activation_error', 'Ошибка активации'), { type: 'error' });
                haptic('error');
                resetBtn();
            }
        } catch (e) {
            showToast(text('miniapp_ui.promo_connection_error', 'Ошибка соединения'), { type: 'error' });
            haptic('error');
            resetBtn();
        }
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

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && menu.classList.contains('more-menu--open')) {
            closeMoreMenu();
        }
    });
}

/* === Overlay Events === */

function initOverlay() {
    const overlay = document.getElementById('detail-overlay');

    document.getElementById('overlayClose').addEventListener('click', () => {
        haptic();
        closeOverlay();
    });

    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            haptic();
            closeOverlay();
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('overlay--open')) {
            haptic();
            closeOverlay();
        }
    });
}

/* === Load Live Data from API === */

/* API URL - relative on prod, tunnel for GitHub Pages / local */
const LOCAL_API_TUNNEL = (typeof window.YANKSWEB_API_BASE === 'string' && window.YANKSWEB_API_BASE)
    ? window.YANKSWEB_API_BASE
    : 'https://few-ants-sit.loca.lt';
const API_URL = (window.location.hostname === 'bot.yanksweb.ru' || window.location.hostname === '185.103.252.41')
    ? ''
    : (window.location.hostname.endsWith('github.io'))
    ? LOCAL_API_TUNNEL
    : 'https://bot.yanksweb.ru';

if (API_URL.includes('loca.lt')) {
    const _fetch = window.fetch.bind(window);
    window.fetch = (url, opts = {}) => {
        const headers = { ...(opts.headers || {}), 'Bypass-Tunnel-Reminder': 'true' };
        return _fetch(url, { ...opts, headers });
    };
}

async function loadLiveData() {
    const endpoints = ['portfolio', 'reviews', 'cases', 'faq', 'promos'];

    for (const key of endpoints) {
        try {
            const isPromos = key === 'promos';
            const initDataParam = isPromos && tg?.initData
                ? `?initData=${encodeURIComponent(tg.initData)}`
                : '';
            const res = await fetch(`${API_URL}/api/${key}${initDataParam}`);
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
                            url: i.url || '',
                            channel_post_url: i.channel_post_url || '',
                        }));
                    } else if (key === 'cases') {
                        const thumbUrl = (url) => {
                            if (!url) return '';
                            const ext = (url.split('.').pop() || '').toLowerCase();
                            if (!['jpg','jpeg','png','webp'].includes(ext)) return '';
                            const parts = url.split('/');
                            const fname = parts.pop();
                            parts.push('thumbs', fname.replace(/\.[^.]+$/, '.webp'));
                            return parts.join('/') + '?v=2';
                        };
                        DATA.cases = json.items.map(i => {
                            const imgBefore = i.before_media_id || '';
                            const imgAfter = i.after_media_id || '';
                            return {
                                id: i.id,
                                title: i.title_ru || '',
                                task: i.task_ru || '',
                                solution: i.solution_ru || '',
                                result: i.result_ru || '',
                                url: i.url || '',
                                image_before: imgBefore,
                                image_after: imgAfter,
                                thumb_before: thumbUrl(imgBefore),
                                thumb_after: thumbUrl(imgAfter),
                                client_name: i.client_name || '',
                                niche: i.niche || '',
                                stack: i.stack || '',
                                timeline: i.timeline || '',
                            };
                        });
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
                            is_eternal: Boolean(i.is_eternal),
                            activation_duration_days: i.activation_duration_days || null,
                            user_activation: i.user_activation || null,
                        }));
                    }
                }
            }
        } catch (e) {
            /* live data unavailable, fallback to bundled DATA */
        }
    }
}

function shouldWarmRemoteContent() {
    const keys = ['portfolio', 'reviews', 'cases', 'faq', 'promos'];
    const missingEmbeddedContent = keys.some((key) => !Array.isArray(DATA[key]));
    return !IS_PROD_MINIAPP || missingEmbeddedContent;
}

function refreshCurrentPageData() {
    if (AppState.currentPage === 'portfolio') {
        PortfolioPage.render(AppState.portfolio.filter);
        return;
    }
    if (AppState.currentPage === 'reviews') ReviewsPage.render();
    if (AppState.currentPage === 'cases') CasesPage.render();
    if (AppState.currentPage === 'faq') FaqPage.render();
    if (AppState.currentPage === 'promos') PromosPage.render();
    if (AppState.currentPage === 'stack') {
        StackPage.reset();
        StackPage.render();
    }
}

/* === Init === */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        setBootStatus(text('miniapp_ui.loader_preparing', 'Подготавливаю интерфейс...'));
        applyStaticTexts();
        initTabBar();
        initMoreMenu();
        initOverlay();
        HomePage.init();
        ChatPage.init();
        CalculatorPage.initEvents();
        AuditPage.init();
        ContactPage.init();
        PortfolioPage.bootstrap();

        const portfolioList = Array.isArray(DATA.portfolio) ? DATA.portfolio : [];
        if (portfolioList.length) {
            const validIds = portfolioList.map(p => p.id);
            AppState.favorites = AppState.favorites.filter(id => validIds.includes(id));
            try { localStorage.setItem('favorites', JSON.stringify(AppState.favorites)); } catch (e) {}
        }

        setBootStatus(text('miniapp_ui.loader_almost', 'Почти готово...'));

        function resolveStatusRequestId() {
            try {
                const qs = new URLSearchParams(window.location.search);
                const q = qs.get('status') || qs.get('request_id');
                if (q) {
                    const n = parseInt(q, 10);
                    if (!isNaN(n)) return n;
                }
            } catch (e) {}
            const m = window.location.hash.match(/^#status-(\d+)$/);
            if (m) {
                const n = parseInt(m[1], 10);
                if (!isNaN(n)) return n;
            }
            try {
                const sp = tg?.initDataUnsafe?.start_param || '';
                const m2 = sp.match(/^status[-_](\d+)$/);
                if (m2) {
                    const n = parseInt(m2[1], 10);
                    if (!isNaN(n)) return n;
                }
            } catch (e) {}
            return null;
        }

        const hash = window.location.hash;
        const caseMatch = hash.match(/^#case-(\d+)$/);
        const statusReqId = resolveStatusRequestId();
        if (statusReqId !== null) {
            Router.navigate('status');
            StatusPage.load(statusReqId);
        } else if (caseMatch && DATA.cases.length) {
            const caseId = parseInt(caseMatch[1], 10);
            const idx = DATA.cases.findIndex(c => c.id === caseId);
            if (idx !== -1) {
                CasesPage._activeIndex = idx;
                CasesPage._view = 'detail';
            }
            Router.navigate('cases');
        } else {
            Router.navigate('home');
        }

        window.addEventListener('hashchange', () => {
            const rid = resolveStatusRequestId();
            if (rid !== null) {
                Router.navigate('status');
                StatusPage.load(rid);
            }
        });

        // Telegram Desktop may reopen Mini App without reload - re-check on visibility
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const rid = resolveStatusRequestId();
                if (rid !== null && StatusPage._requestId !== rid) {
                    Router.navigate('status');
                    StatusPage.load(rid);
                }
            }
        });

        await nextFrame();
        await nextFrame();
        await revealApp();

        if (shouldWarmRemoteContent()) {
            const schedule = window.requestIdleCallback
                ? (cb) => window.requestIdleCallback(cb, { timeout: 1500 })
                : (cb) => setTimeout(cb, 120);

            schedule(async () => {
                try {
                    await loadLiveData();
                    refreshCurrentPageData();
                    applyStaticTexts();
                    PortfolioPage.updateFavoritesCount();
                } catch (e) {
                    /* warm content failed - non-critical */
                }
            });
        }
    } catch (e) {
        console.error('Mini App boot failed', e);
        if (typeof tg !== 'undefined' && tg && tg.showAlert) {
            tg.showAlert('Ошибка загрузки. Попробуйте перезапустить Mini App.');
        }
        await revealApp();
    }
});
