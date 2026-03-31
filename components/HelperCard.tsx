import { useState } from 'react';
import { useLanguage } from './LanguageProvider';
import { ChevronDown, ChevronUp, Share2 } from 'lucide-react';

export function HelperCard({ defaultExpanded = true }: { defaultExpanded?: boolean }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between bg-panel px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Share2 className="h-5 w-5" />
          </div>
          <span className="font-heading font-semibold">
            {t('identity.helperTitle' as any) || 'How clients grant access'}
          </span>
        </div>
        <div className="text-muted">
          {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 py-5 text-sm">
          <ol className="relative ml-3 space-y-4 border-l border-line pb-2 pl-6">
            <li className="relative">
              <span className="absolute -left-8 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted ring-4 ring-white">1</span>
              {t('identity.step1' as any) || 'Go to Meta Business Settings -> Users -> Partners'}
            </li>
            <li className="relative">
              <span className="absolute -left-8 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted ring-4 ring-white">2</span>
              {t('identity.step2' as any) || 'Click Add -> Give partner access'}
            </li>
            <li className="relative">
              <span className="absolute -left-8 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted ring-4 ring-white">3</span>
              {t('identity.step3' as any) || 'Enter our Business ID'}
            </li>
            <li className="relative">
              <span className="absolute -left-8 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted ring-4 ring-white">4</span>
              {t('identity.step4' as any) || 'Select Ad Accounts to share'}
            </li>
            <li className="relative">
              <span className="absolute -left-8 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted ring-4 ring-white">5</span>
              {t('identity.step5' as any) || 'Assign admin manage permissions'}
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
