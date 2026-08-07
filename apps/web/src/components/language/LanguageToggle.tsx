import { Check } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui';
import { useLanguage, type Language } from '@/i18n/LanguageProvider';
import { cn } from '@/lib/utils';

const languageOptions: Array<{ value: Language; flag: string; shortLabel: string; labelKey: string }> = [
  { value: 'id', flag: '🇮🇩', shortLabel: 'ID', labelKey: 'language.indonesian' },
  { value: 'en', flag: '🇬🇧', shortLabel: 'EN', labelKey: 'language.english' },
];

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  const selected = languageOptions.find(option => option.value === language) ?? languageOptions[0];

  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className={cn('h-9 gap-1.5 px-2', className)} aria-label={t('language.switch')}><span className="text-base leading-none" aria-hidden="true">{selected.flag}</span><span className="text-[11px] font-bold">{selected.shortLabel}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>{languageOptions.map(option => <DropdownMenuItem key={option.value} onClick={() => setLanguage(option.value)}><span className="mr-2 text-lg leading-none" aria-hidden="true">{option.flag}</span><span className="flex-1">{t(option.labelKey)}</span>{language === option.value && <Check className="h-4 w-4" />}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
