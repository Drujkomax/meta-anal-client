export const translations = {
  en: {
    // Sidebar
    'nav.dashboard': 'Dashboard',
    'nav.campaigns': 'Campaigns',
    'nav.adSets': 'Ad Sets',
    'nav.ads': 'Ads',
    'nav.dailyData': 'Daily Breakdown',
    'nav.adsInsights': 'Ads Insights',
    'nav.metaSuite': 'Meta Suite',
    'nav.console': 'Analytics Console',

    // Header
    'header.title': 'Meta Ads Analytics',
    'header.account': 'Account',
    'header.synced': 'Synced',
    'header.connect': 'Connect',
    'header.logout': 'Logout',
    'header.sync': '↻ Sync',
    'header.syncing': 'Syncing...',

    // Metrics
    'metric.spend': 'Spend',
    'metric.impressions': 'Impressions',
    'metric.reach': 'Reach',
    'metric.clicks': 'Clicks',
    'metric.uniqueClicks': 'Unique Clicks',
    'metric.ctr': 'CTR',
    'metric.cpc': 'CPC',
    'metric.cpm': 'CPM',
    'metric.frequency': 'Frequency',
    'metric.totalSpend': 'Total Spend',

    // Sections
    'section.crossAccount': 'Cross-Account Summary',
    'section.adInsights': 'Ad Insights',
    'section.trends': 'Spend & Clicks Trend',
    'section.campaign': 'Campaign',
    'section.accountsSuffix': 'accounts',

    // Table
    'table.campaign': 'Campaign',
    'table.adset': 'Ad Set',
    'table.ad': 'Ad',
    'table.status': 'Status',
    'table.budget': 'Budget',
    'table.date': 'Date',
    'table.spend': 'Spend',
    'table.impr': 'Impr.',
    'table.reach': 'Reach',
    'table.clicks': 'Clicks',
    'table.ctr': 'CTR',
    'table.cpc': 'CPC',
    'table.cpm': 'CPM',
    'table.noData': 'No entries found.',

    // Filters
    'search.placeholder': 'Search campaigns...',
    'filter.allStatuses': 'All Statuses',

    // Presets
    'preset.7d': '7 days',
    'preset.14d': '14 days',
    'preset.30d': '30 days',
    'preset.90d': '90 days',

    // Account Switcher
    'switcher.label': 'Select ad account',

    // States & Auth
    'state.loading': 'Loading analytics...',
    'state.workspaceLoading': 'Loading your workspace...',
    'state.noAccounts': 'No ad accounts connected',
    'state.noAccountsDesc': 'Connect Meta OAuth with ads permissions. The backend loads your accessible ad accounts via Marketing API.',
    'state.connectBtn': 'Sign in with Meta',
    'state.error': 'Failed to load analytics. Reconnect the ad account and try again.',
    'state.noData': 'No metrics data found for the selected date range.',
    'state.notAvailable': 'Analytics unavailable for this account.',
    'state.none': 'None',

    // Time Ago
    'time.never': 'Never',
    'time.justNow': 'Just now',
    'time.minAgo': 'm ago',
    'time.hourAgo': 'h ago',
    'time.dayAgo': 'd ago',

    // Ad management nav
    'nav.createAd': 'Create Ad',
    'nav.reports': 'Reports',

    // Create Ad wizard
    'ads.wizard.title': 'Create Ad',
    'ads.step.campaign': 'Campaign',
    'ads.step.adset': 'Ad Set',
    'ads.step.ad': 'Ad',
    'ads.step.review': 'Review',
    'ads.field.name': 'Name',
    'ads.field.objective': 'Objective',
    'ads.field.specialCategory': 'Special ad category',
    'ads.field.dailyBudget': 'Daily budget',
    'ads.field.optimization': 'Optimization goal',
    'ads.field.conversionEvent': 'Conversion event',
    'ads.field.pixel': 'Pixel',
    'ads.field.countries': 'Countries (comma-separated ISO codes)',
    'ads.field.ageMin': 'Min age',
    'ads.field.ageMax': 'Max age',
    'ads.field.genders': 'Genders',
    'ads.field.interests': 'Interests',
    'ads.field.customAudiences': 'Custom audiences',
    'ads.field.excludedAudiences': 'Excluded audiences',
    'ads.field.placements': 'Placements',
    'ads.field.page': 'Page',
    'ads.field.post': 'Post to promote',
    'ads.opt.all': 'All',
    'ads.opt.male': 'Male',
    'ads.opt.female': 'Female',
    'ads.action.next': 'Next',
    'ads.action.back': 'Back',
    'ads.action.publish': 'Publish (paused)',
    'ads.action.publishing': 'Publishing...',
    'ads.action.addInterest': 'Search & add interest',
    'ads.note.paused': 'Everything is created paused — nothing spends until you activate it.',
    'ads.note.conversions': 'Pick a pixel and event to optimize for conversions ("event" ads).',
    'ads.success': 'Created (paused).',
    'ads.error': 'Failed to create. Check fields and Meta permissions.',

    // Manage actions
    'manage.pause': 'Pause',
    'manage.resume': 'Resume',
    'manage.activate': 'Activate',
    'manage.delete': 'Delete',
    'manage.editBudget': 'Edit budget',
    'manage.confirmDelete': 'Delete this object in Meta?',
    'manage.saving': 'Saving...',
    'manage.newBudget': 'New daily budget',

    // Reports
    'reports.title': 'Reports',
    'reports.level': 'Level',
    'reports.generate': 'Generate',
    'reports.exportCsv': 'Export CSV',
    'reports.exportXlsx': 'Export Excel',
    'reports.empty': 'No data for the selected filters.',
  },
  ru: {
    // Sidebar
    'nav.dashboard': 'Дашборд',
    'nav.campaigns': 'Кампании',
    'nav.adSets': 'Группы объявлений',
    'nav.ads': 'Объявления',
    'nav.dailyData': 'Разбивка по дням',
    'nav.adsInsights': 'Аналитика рекламы',
    'nav.metaSuite': 'Meta Инструменты',
    'nav.console': 'Панель аналитики',

    // Header
    'header.title': 'Аналитика Meta Ads',
    'header.account': 'Аккаунт',
    'header.synced': 'Синхронизировано',
    'header.connect': 'Подключить',
    'header.logout': 'Выйти',
    'header.sync': '↻ Обновить',
    'header.syncing': 'Обновление...',

    // Metrics
    'metric.spend': 'Расход',
    'metric.impressions': 'Показы',
    'metric.reach': 'Охват',
    'metric.clicks': 'Клики',
    'metric.uniqueClicks': 'Уникальные клики',
    'metric.ctr': 'CTR',
    'metric.cpc': 'CPC',
    'metric.cpm': 'CPM',
    'metric.frequency': 'Частота',
    'metric.totalSpend': 'Общий расход',

    // Sections
    'section.crossAccount': 'Сводка по всем аккаунтам',
    'section.adInsights': 'Данные рекламы',
    'section.trends': 'Тренды расхода и кликов',
    'section.campaign': 'Кампания',
    'section.accountsSuffix': 'аккаунта(ов)',

    // Table
    'table.campaign': 'Кампания',
    'table.adset': 'Группа объяв.',
    'table.ad': 'Объявление',
    'table.status': 'Статус',
    'table.budget': 'Бюджет',
    'table.date': 'Дата',
    'table.spend': 'Расход',
    'table.impr': 'Показы',
    'table.reach': 'Охват',
    'table.clicks': 'Клики',
    'table.ctr': 'CTR',
    'table.cpc': 'CPC',
    'table.cpm': 'CPM',
    'table.noData': 'Данные не найдены.',

    // Filters
    'search.placeholder': 'Поиск кампаний...',
    'filter.allStatuses': 'Все статусы',

    // Presets
    'preset.7d': '7 дней',
    'preset.14d': '14 дней',
    'preset.30d': '30 дней',
    'preset.90d': '90 дней',

    // Account Switcher
    'switcher.label': 'Выберите аккаунт',

    // States & Auth
    'state.loading': 'Загрузка аналитики...',
    'state.workspaceLoading': 'Загрузка рабочего пространства...',
    'state.noAccounts': 'Рекламные аккаунты не подключены',
    'state.noAccountsDesc': 'Подключите Meta OAuth с разрешениями на рекламу. Бэкенд загрузит доступные аккаунты через Marketing API.',
    'state.connectBtn': 'Войти через Meta',
    'state.error': 'Ошибка загрузки аналитики. Переподключите аккаунт и попробуйте снова.',
    'state.noData': 'Данные не найдены за выбранный период.',
    'state.notAvailable': 'Аналитика недоступна для этого аккаунта.',
    'state.none': 'Нет',

    // Time Ago
    'time.never': 'Никогда',
    'time.justNow': 'Только что',
    'time.minAgo': 'м назад',
    'time.hourAgo': 'ч назад',
    'time.dayAgo': 'д назад',

    // Ad management nav
    'nav.createAd': 'Создать рекламу',
    'nav.reports': 'Отчёты',

    // Create Ad wizard
    'ads.wizard.title': 'Создание рекламы',
    'ads.step.campaign': 'Кампания',
    'ads.step.adset': 'Группа объявлений',
    'ads.step.ad': 'Объявление',
    'ads.step.review': 'Проверка',
    'ads.field.name': 'Название',
    'ads.field.objective': 'Цель',
    'ads.field.specialCategory': 'Категория рекламы',
    'ads.field.dailyBudget': 'Дневной бюджет',
    'ads.field.optimization': 'Цель оптимизации',
    'ads.field.conversionEvent': 'Событие-конверсия',
    'ads.field.pixel': 'Пиксель',
    'ads.field.countries': 'Страны (ISO-коды через запятую)',
    'ads.field.ageMin': 'Возраст от',
    'ads.field.ageMax': 'Возраст до',
    'ads.field.genders': 'Пол',
    'ads.field.interests': 'Интересы',
    'ads.field.customAudiences': 'Пользовательские аудитории',
    'ads.field.excludedAudiences': 'Исключённые аудитории',
    'ads.field.placements': 'Плейсменты',
    'ads.field.page': 'Страница',
    'ads.field.post': 'Пост для продвижения',
    'ads.opt.all': 'Все',
    'ads.opt.male': 'Мужчины',
    'ads.opt.female': 'Женщины',
    'ads.action.next': 'Далее',
    'ads.action.back': 'Назад',
    'ads.action.publish': 'Опубликовать (на паузе)',
    'ads.action.publishing': 'Публикуем...',
    'ads.action.addInterest': 'Найти и добавить интерес',
    'ads.note.paused': 'Всё создаётся на паузе — траты не идут, пока вы не активируете.',
    'ads.note.conversions': 'Выберите пиксель и событие для оптимизации под конверсии («event»-реклама).',
    'ads.success': 'Создано (на паузе).',
    'ads.error': 'Не удалось создать. Проверьте поля и разрешения Meta.',

    // Manage actions
    'manage.pause': 'Пауза',
    'manage.resume': 'Возобновить',
    'manage.activate': 'Активировать',
    'manage.delete': 'Удалить',
    'manage.editBudget': 'Изменить бюджет',
    'manage.confirmDelete': 'Удалить этот объект в Meta?',
    'manage.saving': 'Сохранение...',
    'manage.newBudget': 'Новый дневной бюджет',

    // Reports
    'reports.title': 'Отчёты',
    'reports.level': 'Уровень',
    'reports.generate': 'Построить',
    'reports.exportCsv': 'Экспорт CSV',
    'reports.exportXlsx': 'Экспорт Excel',
    'reports.empty': 'Нет данных по выбранным фильтрам.',
  },
};

export type Language = 'en' | 'ru';
export type TranslationKey = keyof typeof translations['en'];
