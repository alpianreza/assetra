import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { login } from '../api';
import { apiRequest } from '@/lib/api-helper';
import { queryClient } from '@/app/queryClient';
import { AUTH_QUERY_KEY } from '../constants';
import { useLanguage } from '@/i18n/LanguageProvider';
import { LanguageToggle } from '@/components/language/LanguageToggle';
import { Alert, AlertDescription, AlertTitle, Button, Input, Label } from '@/components/ui';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { AlertCircle, ArrowRight, BarChart3, CheckSquare2, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';

type LoginValues = { identifier: string; password: string };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { data: brandingResponse } = useQuery({ queryKey: ['public-branding'], queryFn: () => apiRequest<any>('/branding'), staleTime: 5 * 60 * 1000, retry: false });
  const branding = brandingResponse?.data;
  const companyName = branding?.name || 'Assetra';
  const loginSchema = z.object({
    identifier: z.string().min(1, t('auth.identifierRequired')),
    password: z.string().min(1, t('auth.passwordRequired')),
  });
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: userData => {
      queryClient.setQueryData(AUTH_QUERY_KEY, userData);
      const from = (location.state as any)?.from;
      navigate(from ? `${from.pathname ?? '/'}${from.search ?? ''}${from.hash ?? ''}` : '/', { replace: true });
    },
    onError: (error: Error) => setServerError(error.message || t('auth.genericError')),
  });

  return <div className="relative min-h-screen overflow-hidden bg-slate-950 p-0 lg:grid lg:place-items-center lg:p-6">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(59,130,246,0.24),transparent_32%),radial-gradient(circle_at_88%_88%,rgba(34,211,238,0.15),transparent_30%)]" />
    <div className="absolute right-4 top-4 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/50 p-1 text-white backdrop-blur"><LanguageToggle className="text-white hover:bg-white/10 hover:text-white" /><ThemeToggle /></div>

    <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-5xl overflow-hidden bg-card shadow-2xl lg:min-h-[620px] lg:grid-cols-[1.08fr_0.92fr] lg:rounded-3xl lg:border lg:border-white/10">
      <section className="relative hidden overflow-hidden bg-[linear-gradient(145deg,#101d35,#15294b_58%,#123650)] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -bottom-32 -right-28 h-80 w-80 rounded-full border border-white/10 shadow-[0_0_0_48px_rgba(255,255,255,0.025),0_0_0_96px_rgba(255,255,255,0.015)]" /><div className="relative"><div className="mb-12 flex items-center gap-3">{branding?.logoUrl ? <img src={branding.logoUrl} alt={companyName} className="h-14 max-w-32 object-contain" /> : <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-cyan-400"><span className="h-5 w-5 rounded-full bg-[#132541]" /></span>}<div><p className="text-xl font-bold">{branding?.shortName || companyName}</p><p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Enterprise workspace</p></div></div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300"><ShieldCheck className="h-4 w-4" />{t('auth.assetManagement')}</p><h1 className="mt-4 max-w-md text-4xl font-bold leading-tight tracking-[-0.04em]">{t('auth.heroTitle')}</h1><p className="mt-4 max-w-md text-sm leading-7 text-white/65">{t('auth.heroDescription')}</p><div className="mt-10 space-y-4"><Benefit icon={CheckSquare2} text={t('auth.benefitSchedule')} /><Benefit icon={BarChart3} text={t('auth.benefitAnalytics')} /><Benefit icon={LockKeyhole} text={t('auth.benefitSecurity')} /></div></div><p className="relative text-xs text-white/40">© {new Date().getFullYear()} {companyName}</p></section>

      <section className="flex min-h-screen items-center bg-card px-6 py-20 sm:px-12 lg:min-h-0 lg:px-14 lg:py-12"><div className="mx-auto w-full max-w-sm"><div className="mb-9 lg:hidden">{branding?.logoUrl ? <img src={branding.logoUrl} alt={companyName} className="mb-4 h-14 max-w-32 object-contain" /> : <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">A</span>}<p className="font-bold">{branding?.shortName || companyName}</p></div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Enterprise Asset Management</p><h2 className="mt-2 text-3xl font-bold tracking-tight">{t('auth.signInTitle')}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t('auth.signInDescription')}</p>
        <form onSubmit={handleSubmit(values => { setServerError(null); mutation.mutate(values); })} className="mt-8 space-y-5"><div className="space-y-2"><Label htmlFor="identifier">{t('auth.identifier')}</Label><div className="relative"><UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="identifier" autoFocus autoComplete="username" placeholder={t('auth.identifierPlaceholder')} className="h-12 pl-10" {...register('identifier')} /></div>{errors.identifier && <p className="text-xs text-destructive">{errors.identifier.message}</p>}</div><div className="space-y-2"><Label htmlFor="password">{t('auth.password')}</Label><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder={t('auth.passwordPlaceholder')} className="h-12 px-10" {...register('password')} /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>{errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}</div>{serverError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t('auth.failed')}</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert>}<Button type="submit" className="h-12 w-full" disabled={mutation.isPending}>{mutation.isPending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />{t('auth.processing')}</> : <>{t('auth.signIn')}<ArrowRight className="ml-2 h-4 w-4" /></>}</Button></form><p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />{t('auth.secure')}</p></div></section>
    </main>
  </div>;
}

function Benefit({ icon: Icon, text }: { icon: typeof CheckSquare2; text: string }) {
  return <div className="flex items-center gap-3 text-sm font-medium text-white/85"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07]"><Icon className="h-4 w-4" /></span>{text}</div>;
}
