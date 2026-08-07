import * as React from 'react';

export type Language = 'id' | 'en';
type Variables = Record<string, string | number>;

type Dictionary = Record<string, string>;

const messages: Record<Language, Dictionary> = {
  id: {
    'language.label': 'Bahasa',
    'language.indonesian': 'Bahasa Indonesia',
    'language.english': 'English',
    'language.switch': 'Ganti bahasa',
    'nav.homeGroup': 'Home',
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.operations': 'Operasional',
    'nav.inventory': 'Inventaris',
    'nav.execution': 'Pelaksanaan Checklist',
    'nav.compliance': 'Compliance',
    'nav.checklistMaster': 'Checklist Master',
    'nav.sessions': 'Sesi Checklist',
    'nav.data': 'Data',
    'nav.masterData': 'Master Data',
    'nav.reporting': 'Reporting',
    'nav.qrCenter': 'QR Center',
    'nav.printCenter': 'Print Center',
    'nav.administration': 'Administration',
    'nav.users': 'Pengguna',
    'nav.roles': 'Role & Permission',
    'nav.settings': 'Settings',
    'nav.workdays': 'Hari Kerja & Libur',
    'nav.organization': 'Organisasi',
    'common.user': 'Pengguna',
    'common.logout': 'Keluar',
    'common.appearance': 'Tampilan',
    'common.open': 'Buka',
    'common.period': 'Periode',
    'common.loading': 'Memuat...',
    'common.noData': 'Belum ada data.',
    'auth.identifierRequired': 'Username atau email wajib diisi',
    'auth.passwordRequired': 'Password wajib diisi',
    'auth.genericError': 'Terjadi kesalahan saat login',
    'auth.assetManagement': 'Asset & compliance management',
    'auth.heroTitle': 'Kelola aset dan kepatuhan dengan lebih terarah.',
    'auth.heroDescription': 'Assetra menyatukan checklist, inventaris, QR, temuan, dan laporan operasional dalam satu sistem.',
    'auth.benefitSchedule': 'Checklist terjadwal dan mudah dipantau',
    'auth.benefitAnalytics': 'Analitik progres secara real-time',
    'auth.benefitSecurity': 'Akses aman berdasarkan peran pengguna',
    'auth.signInTitle': 'Masuk ke Assetra',
    'auth.signInDescription': 'Gunakan akun perusahaan untuk melanjutkan ke workspace Anda.',
    'auth.identifier': 'Username atau Email',
    'auth.identifierPlaceholder': 'Masukkan username atau email',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Masukkan password',
    'auth.showPassword': 'Tampilkan password',
    'auth.hidePassword': 'Sembunyikan password',
    'auth.failed': 'Login gagal',
    'auth.processing': 'Memproses...',
    'auth.signIn': 'Masuk',
    'auth.secure': 'Koneksi aman untuk pengguna terotorisasi',
    'home.workspace': 'Workspace saya',
    'home.welcome': 'Selamat datang, {name}',
    'home.description': 'Lihat pekerjaan yang menjadi tanggung jawab Anda dan selesaikan checklist dari satu halaman.',
    'home.startChecklist': 'Mulai checklist',
    'home.periodProgress': 'Progress periode',
    'home.myInventory': 'Inventaris saya',
    'home.myInventoryNote': 'Aset yang menjadi tanggung jawab Anda',
    'home.pendingChecklist': 'Belum checklist',
    'home.affectedInventory': '{count} inventaris terdampak',
    'home.findings': 'Temuan',
    'home.followUp': 'Perlu tindak lanjut',
    'home.noFindings': 'Tidak ada temuan',
    'home.queue': 'Antrian kerja',
    'home.priority': 'Prioritas checklist',
    'home.outstandingAt': 'Kewajiban yang belum selesai pada {period}.',
    'home.assets': '{count} aset',
    'home.allComplete': 'Semua checklist selesai',
    'home.noQueue': 'Tidak ada antrian untuk periode ini.',
    'home.remaining': '{count} tersisa',
    'home.periodHealth': 'Kesehatan periode',
    'home.complete': 'selesai',
    'home.periodComplete': 'Periode selesai',
    'home.almostComplete': 'Hampir selesai',
    'home.needsAttention': 'Butuh perhatian',
    'home.obligationsComplete': '{completed} dari {total} kewajiban selesai.',
    'home.openAnalytics': 'Buka dashboard analitik',
    'frequency.daily': 'Harian',
    'frequency.weekly': 'Mingguan',
    'frequency.monthly': 'Bulanan',
    'dashboard.workspace': 'Analytics workspace',
    'dashboard.title': 'Dashboard Compliance',
    'dashboard.description': 'Analitik inventaris, checklist, area, dan kondisi operasional.',
    'dashboard.allAreas': 'Semua Area',
    'dashboard.allCategories': 'Semua Kategori',
    'dashboard.totalInventory': 'Total Inventaris',
    'dashboard.totalInventoryNote': 'Seluruh aset terdaftar',
    'dashboard.activeAssets': 'Aset Aktif',
    'dashboard.activeAssetsNote': 'Aset operasional',
    'dashboard.maintenance': 'Maintenance',
    'dashboard.maintenanceNote': 'Dalam perbaikan',
    'dashboard.completedChecklist': 'Checklist Selesai',
    'dashboard.completedChecklistNote': 'Jawaban sesuai',
    'dashboard.findings': 'Temuan',
    'dashboard.findingsNote': 'Jawaban tidak sesuai',
    'dashboard.pendingChecklist': 'Belum Checklist',
    'dashboard.pendingChecklistNote': 'Kewajiban pengguna',
    'dashboard.areaDistribution': 'Distribusi inventaris per area',
    'dashboard.areaDescription': 'Perbandingan jumlah aset pada area teratas',
    'dashboard.noArea': 'Belum ada data area.',
    'dashboard.inventoryStatus': 'Status inventaris',
    'dashboard.totalAssets': 'total aset',
    'dashboard.active': 'Aktif',
    'dashboard.inactive': 'Nonaktif',
    'dashboard.disposed': 'Disposed',
    'dashboard.categoryDistribution': 'Distribusi kategori',
    'dashboard.noCategory': 'Belum ada data kategori.',
    'dashboard.complianceHealth': 'Kesehatan compliance',
    'dashboard.completedObligations': 'Kewajiban selesai',
    'dashboard.incomplete': 'Belum selesai',
    'dashboard.periodFindings': 'Temuan periode',
    'dashboard.myProgress': 'Progress saya',
    'dashboard.accessDenied': 'Akses ditolak',
    'dashboard.permissionRequired': 'Dashboard analitik hanya tersedia untuk pengguna yang memiliki izin dashboard.',
    'master.summary': 'Ringkasan',
    'master.category': 'Kategori',
    'master.itemType': 'Jenis Item',
    'master.area': 'Area',
    'master.structure': 'Struktur data',
    'master.title': 'Master Data',
    'master.description': 'Kategori → jenis item → pertanyaan checklist.',
  },
  en: {
    'language.label': 'Language',
    'language.indonesian': 'Bahasa Indonesia',
    'language.english': 'English',
    'language.switch': 'Switch language',
    'nav.homeGroup': 'Home',
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.operations': 'Operations',
    'nav.inventory': 'Inventory',
    'nav.execution': 'Checklist Execution',
    'nav.compliance': 'Compliance',
    'nav.checklistMaster': 'Checklist Master',
    'nav.sessions': 'Checklist Sessions',
    'nav.data': 'Data',
    'nav.masterData': 'Master Data',
    'nav.reporting': 'Reporting',
    'nav.qrCenter': 'QR Center',
    'nav.printCenter': 'Print Center',
    'nav.administration': 'Administration',
    'nav.users': 'Users',
    'nav.roles': 'Roles & Permissions',
    'nav.settings': 'Settings',
    'nav.workdays': 'Workdays & Holidays',
    'nav.organization': 'Organization',
    'common.user': 'User',
    'common.logout': 'Sign out',
    'common.appearance': 'Appearance',
    'common.open': 'Open',
    'common.period': 'Period',
    'common.loading': 'Loading...',
    'common.noData': 'No data yet.',
    'auth.identifierRequired': 'Username or email is required',
    'auth.passwordRequired': 'Password is required',
    'auth.genericError': 'An error occurred while signing in',
    'auth.assetManagement': 'Asset & compliance management',
    'auth.heroTitle': 'Manage assets and compliance with greater clarity.',
    'auth.heroDescription': 'Assetra brings checklists, inventory, QR, findings, and operational reports together in one system.',
    'auth.benefitSchedule': 'Scheduled checklists that are easy to monitor',
    'auth.benefitAnalytics': 'Real-time progress analytics',
    'auth.benefitSecurity': 'Secure role-based access',
    'auth.signInTitle': 'Sign in to Assetra',
    'auth.signInDescription': 'Use your company account to continue to your workspace.',
    'auth.identifier': 'Username or Email',
    'auth.identifierPlaceholder': 'Enter your username or email',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Enter your password',
    'auth.showPassword': 'Show password',
    'auth.hidePassword': 'Hide password',
    'auth.failed': 'Sign-in failed',
    'auth.processing': 'Signing in...',
    'auth.signIn': 'Sign in',
    'auth.secure': 'Secure connection for authorized users',
    'home.workspace': 'My workspace',
    'home.welcome': 'Welcome, {name}',
    'home.description': 'Review your assigned work and complete checklists from one place.',
    'home.startChecklist': 'Start checklist',
    'home.periodProgress': 'Period progress',
    'home.myInventory': 'My inventory',
    'home.myInventoryNote': 'Assets assigned to you',
    'home.pendingChecklist': 'Pending checklists',
    'home.affectedInventory': '{count} affected assets',
    'home.findings': 'Findings',
    'home.followUp': 'Follow-up required',
    'home.noFindings': 'No findings',
    'home.queue': 'Work queue',
    'home.priority': 'Checklist priorities',
    'home.outstandingAt': 'Outstanding obligations for {period}.',
    'home.assets': '{count} assets',
    'home.allComplete': 'All checklists completed',
    'home.noQueue': 'There is no work queue for this period.',
    'home.remaining': '{count} remaining',
    'home.periodHealth': 'Period health',
    'home.complete': 'complete',
    'home.periodComplete': 'Period completed',
    'home.almostComplete': 'Almost complete',
    'home.needsAttention': 'Needs attention',
    'home.obligationsComplete': '{completed} of {total} obligations completed.',
    'home.openAnalytics': 'Open analytics dashboard',
    'frequency.daily': 'Daily',
    'frequency.weekly': 'Weekly',
    'frequency.monthly': 'Monthly',
    'dashboard.workspace': 'Analytics workspace',
    'dashboard.title': 'Compliance Dashboard',
    'dashboard.description': 'Analytics for inventory, checklists, areas, and operational status.',
    'dashboard.allAreas': 'All Areas',
    'dashboard.allCategories': 'All Categories',
    'dashboard.totalInventory': 'Total Inventory',
    'dashboard.totalInventoryNote': 'All registered assets',
    'dashboard.activeAssets': 'Active Assets',
    'dashboard.activeAssetsNote': 'Operational assets',
    'dashboard.maintenance': 'Maintenance',
    'dashboard.maintenanceNote': 'Under maintenance',
    'dashboard.completedChecklist': 'Completed Checklists',
    'dashboard.completedChecklistNote': 'Compliant answers',
    'dashboard.findings': 'Findings',
    'dashboard.findingsNote': 'Non-compliant answers',
    'dashboard.pendingChecklist': 'Pending Checklists',
    'dashboard.pendingChecklistNote': 'User obligations',
    'dashboard.areaDistribution': 'Inventory distribution by area',
    'dashboard.areaDescription': 'Asset comparison across top areas',
    'dashboard.noArea': 'No area data yet.',
    'dashboard.inventoryStatus': 'Inventory status',
    'dashboard.totalAssets': 'total assets',
    'dashboard.active': 'Active',
    'dashboard.inactive': 'Inactive',
    'dashboard.disposed': 'Disposed',
    'dashboard.categoryDistribution': 'Category distribution',
    'dashboard.noCategory': 'No category data yet.',
    'dashboard.complianceHealth': 'Compliance health',
    'dashboard.completedObligations': 'Completed obligations',
    'dashboard.incomplete': 'Incomplete',
    'dashboard.periodFindings': 'Period findings',
    'dashboard.myProgress': 'My progress',
    'dashboard.accessDenied': 'Access denied',
    'dashboard.permissionRequired': 'The analytics dashboard is only available to users with dashboard permission.',
    'master.summary': 'Overview',
    'master.category': 'Categories',
    'master.itemType': 'Item Types',
    'master.area': 'Areas',
    'master.structure': 'Data structure',
    'master.title': 'Master Data',
    'master.description': 'Category → item type → checklist questions.',
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, variables?: Variables) => string;
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

function initialLanguage(): Language {
  if (typeof window === 'undefined') return 'id';
  const saved = localStorage.getItem('assetra-language');
  return saved === 'en' ? 'en' : 'id';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(initialLanguage);

  const setLanguage = React.useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    localStorage.setItem('assetra-language', nextLanguage);
  }, []);

  const toggleLanguage = React.useCallback(() => {
    setLanguage(language === 'id' ? 'en' : 'id');
  }, [language, setLanguage]);

  const t = React.useCallback((key: string, variables?: Variables) => {
    let value = messages[language][key] ?? messages.id[key] ?? key;
    if (variables) {
      for (const [name, replacement] of Object.entries(variables)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
      }
    }
    return value;
  }, [language]);

  React.useEffect(() => {
    document.documentElement.lang = language === 'id' ? 'id' : 'en';
    document.documentElement.dataset.language = language;
  }, [language]);

  return <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = React.useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
