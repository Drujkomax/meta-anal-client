import { useLanguage } from './LanguageProvider';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-panel p-1">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
          language === 'en' ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('ru')}
        className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
          language === 'ru' ? 'bg-ink text-white shadow-sm' : 'text-muted hover:text-ink'
        }`}
      >
        RU
      </button>
    </div>
  );
}
