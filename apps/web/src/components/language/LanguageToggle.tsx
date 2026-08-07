import { Check, Languages } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui';
import { useLanguage, type Language } from '@/i18n/LanguageProvider';
import { cn } from '@/lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  const select = (nextLanguage: Language) => setLanguage(nextLanguage);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('h-9 gap-1.5 px-2', className)} aria-label={t('language.switch')}>
          <Languages className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t('language.label')}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => select('id')}>
          <span className="mr-2">ID</span>
          <span className="flex-1">{t('language.indonesian')}</span>
          {language === 'id' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => select('en')}>
          <span className="mr-2">EN</span>
          <span className="flex-1">{t('language.english')}</span>
          {language === 'en' && <Check className="h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
