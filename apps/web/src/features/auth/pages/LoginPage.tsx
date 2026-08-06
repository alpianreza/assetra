import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { login } from '../api';
import { queryClient } from '@/app/queryClient';
import { AUTH_QUERY_KEY } from '../constants';
import { Button, Input, Label, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { useTheme } from '@/components/theme/theme-provider';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username atau email wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (userData) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, userData);
      const from = (location.state as any)?.from;
      const destination = from
        ? `${from.pathname ?? '/'}${from.search ?? ''}${from.hash ?? ''}`
        : '/';
      navigate(destination, { replace: true });
    },
    onError: (error: Error) => {
      setServerError(error.message || 'Terjadi kesalahan saat login');
    },
  });

  const onSubmit = (data: LoginValues) => {
    setServerError(null);
    mutation.mutate(data);
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className={`absolute -top-32 -right-32 h-96 w-96 rounded-full blur-3xl ${isDark ? 'bg-primary/20' : 'bg-primary/10'}`} />
        <div className={`absolute -bottom-32 -left-32 h-96 w-96 rounded-full blur-3xl ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-500/10'}`} />
      </div>

      <div className="absolute right-4 top-4"><ThemeToggle /></div>

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card shadow-2xl backdrop-blur-sm">
          <div className="border-b border-border p-8 pb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">A</div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Assetra</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enterprise Compliance Management</p>
          </div>

          <div className="p-8 pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="identifier">Username atau Email</Label>
                <Input id="identifier" type="text" autoComplete="username" placeholder="admin@example.com" {...register('identifier')} />
                {errors.identifier && <p className="text-sm text-destructive">{errors.identifier.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" className="pr-10" {...register('password')} />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              {serverError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Login gagal</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Masuk...' : 'Masuk'}
              </Button>
            </form>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Assetra. All rights reserved.</p>
      </div>
    </div>
  );
}
