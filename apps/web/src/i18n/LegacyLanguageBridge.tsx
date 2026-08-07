import * as React from 'react';
import { useLanguage } from './LanguageProvider';

const idToEn = new Map<string, string>([
  ['Home', 'Home'],
  ['Dashboard', 'Dashboard'],
  ['Operasional', 'Operations'],
  ['Inventaris', 'Inventory'],
  ['Pelaksanaan Checklist', 'Checklist Execution'],
  ['Checklist Master', 'Checklist Master'],
  ['Sesi Checklist', 'Checklist Sessions'],
  ['Master Data', 'Master Data'],
  ['Pengguna', 'Users'],
  ['Role & Permission', 'Roles & Permissions'],
  ['Hari Kerja & Libur', 'Workdays & Holidays'],
  ['Organisasi', 'Organization'],
  ['Tampilan', 'Appearance'],
  ['Keluar', 'Sign out'],
  ['Tambah', 'Add'],
  ['Simpan', 'Save'],
  ['Menyimpan...', 'Saving...'],
  ['Batal', 'Cancel'],
  ['Hapus', 'Delete'],
  ['Edit', 'Edit'],
  ['Detail', 'Details'],
  ['Buka', 'Open'],
  ['Cari', 'Search'],
  ['Memuat...', 'Loading...'],
  ['Memuat kategori...', 'Loading categories...'],
  ['Memuat jenis item...', 'Loading item types...'],
  ['Memuat checklist master...', 'Loading checklist master...'],
  ['Belum ada data.', 'No data yet.'],
  ['Tidak ada kategori.', 'No categories found.'],
  ['Tidak ada jenis item.', 'No item types found.'],
  ['Belum ada kategori.', 'No categories yet.'],
  ['Belum ada jenis item dalam kategori ini.', 'No item types in this category yet.'],
  ['Tidak memiliki permission untuk melihat jenis item.', 'You do not have permission to view item types.'],
  ['Pertanyaan disembunyikan karena permission Checklist Master belum diberikan.', 'Questions are hidden because Checklist Master permission has not been granted.'],
  ['Belum ada pertanyaan checklist.', 'No checklist questions yet.'],
  ['Kelola Pertanyaan', 'Manage Questions'],
  ['wajib foto', 'photo required'],
  ['Struktur data', 'Data structure'],
  ['Kategori → jenis item → pertanyaan checklist.', 'Category → item type → checklist questions.'],
  ['Ringkasan', 'Overview'],
  ['Kategori', 'Categories'],
  ['Jenis Item', 'Item Types'],
  ['Area', 'Areas'],
  ['Kategori Inventaris', 'Inventory Categories'],
  ['Tambah Kategori', 'Add Category'],
  ['Edit Kategori', 'Edit Category'],
  ['Nama Kategori', 'Category Name'],
  ['Kode', 'Code'],
  ['Total Item', 'Total Items'],
  ['Aksi', 'Actions'],
  ['Tambah Jenis Item', 'Add Item Type'],
  ['Edit Jenis Item', 'Edit Item Type'],
  ['Nama Item', 'Item Name'],
  ['Frekuensi Pengecekan', 'Checklist Frequency'],
  ['Frekuensi Cek', 'Checklist Frequency'],
  ['Izinkan status N/A', 'Allow N/A status'],
  ['Aktif', 'Active'],
  ['Nonaktif', 'Inactive'],
  ['Ya', 'Yes'],
  ['Tidak', 'No'],
  ['Harian', 'Daily'],
  ['Mingguan', 'Weekly'],
  ['Bulanan', 'Monthly'],
  ['Tambah Area', 'Add Area'],
  ['Edit Area', 'Edit Area'],
  ['Nama Area', 'Area Name'],
  ['Detail Lokasi', 'Location Details'],
  ['Kelola area lokasi inventaris.', 'Manage inventory location areas.'],
  ['Belum ada area', 'No areas yet'],
  ['Tambahkan area pertama Anda.', 'Add your first area.'],
  ['Tambah Checklist', 'Add Checklist'],
  ['Lengkapi', 'Complete'],
  ['Belum diatur', 'Not configured'],
  ['N/A diizinkan', 'N/A allowed'],
  ['Buat sekarang', 'Create now'],
  ['Tambah Inventaris', 'Add Inventory'],
  ['Cari nomor inventaris, jenis item, area...', 'Search inventory number, item type, or area...'],
  ['Semua Status', 'All Statuses'],
  ['Semua Kategori', 'All Categories'],
  ['Semua Area', 'All Areas'],
  ['Semua Jenis Item', 'All Item Types'],
  ['Status', 'Status'],
  ['Lokasi', 'Location'],
  ['PIC', 'PIC'],
  ['Dibuat', 'Created'],
  ['Diperbarui', 'Updated'],
  ['Maintenance', 'Maintenance'],
  ['Dilepas', 'Disposed'],
  ['Sebelumnya', 'Previous'],
  ['Berikutnya', 'Next'],
  ['Workspace saya', 'My workspace'],
  ['Mulai checklist', 'Start checklist'],
  ['Progress periode', 'Period progress'],
  ['Inventaris saya', 'My inventory'],
  ['Belum checklist', 'Pending checklists'],
  ['Temuan', 'Findings'],
  ['Antrian kerja', 'Work queue'],
  ['Prioritas checklist', 'Checklist priorities'],
  ['Semua checklist selesai', 'All checklists completed'],
  ['Tidak ada antrian untuk periode ini.', 'There is no work queue for this period.'],
  ['Kesehatan periode', 'Period health'],
  ['Periode selesai', 'Period completed'],
  ['Hampir selesai', 'Almost complete'],
  ['Butuh perhatian', 'Needs attention'],
  ['Buka dashboard analitik', 'Open analytics dashboard'],
  ['Analytics workspace', 'Analytics workspace'],
  ['Dashboard Compliance', 'Compliance Dashboard'],
  ['Analitik inventaris, checklist, area, dan kondisi operasional.', 'Analytics for inventory, checklists, areas, and operational status.'],
  ['Total Inventaris', 'Total Inventory'],
  ['Seluruh aset terdaftar', 'All registered assets'],
  ['Aset Aktif', 'Active Assets'],
  ['Aset operasional', 'Operational assets'],
  ['Dalam perbaikan', 'Under maintenance'],
  ['Checklist Selesai', 'Completed Checklists'],
  ['Jawaban sesuai', 'Compliant answers'],
  ['Jawaban tidak sesuai', 'Non-compliant answers'],
  ['Belum Checklist', 'Pending Checklists'],
  ['Kewajiban pengguna', 'User obligations'],
  ['Distribusi inventaris per area', 'Inventory distribution by area'],
  ['Perbandingan jumlah aset pada area teratas', 'Asset comparison across top areas'],
  ['Belum ada data area.', 'No area data yet.'],
  ['Status inventaris', 'Inventory status'],
  ['total aset', 'total assets'],
  ['Distribusi kategori', 'Category distribution'],
  ['Belum ada data kategori.', 'No category data yet.'],
  ['Kesehatan compliance', 'Compliance health'],
  ['Kewajiban selesai', 'Completed obligations'],
  ['Belum selesai', 'Incomplete'],
  ['Temuan periode', 'Period findings'],
  ['Progress saya', 'My progress'],
  ['Akses ditolak', 'Access denied'],
  ['Print Center', 'Print Center'],
  ['Pilih inventaris', 'Select inventory'],
  ['Pilih semua hasil', 'Select all results'],
  ['Cari inventaris...', 'Search inventory...'],
  ['Parameter print', 'Print parameters'],
  ['Buat dokumen', 'Create document'],
  ['Unduh XLSX', 'Download XLSX'],
  ['Logo perusahaan', 'Company logo'],
  ['Logo belum diatur', 'Company logo is not configured'],
  ['Ganti logo', 'Change logo'],
  ['Unggah logo', 'Upload logo'],
  ['Informasi perusahaan', 'Company information'],
  ['Nama Perusahaan', 'Company Name'],
  ['Nama Singkat', 'Short Name'],
  ['Alamat', 'Address'],
  ['Telepon', 'Phone'],
  ['Website', 'Website'],
  ['Footer Laporan', 'Report Footer'],
  ['Simpan pengaturan', 'Save settings'],
]);

const enToId = new Map(Array.from(idToEn.entries()).map(([id, en]) => [en, id]));

function preserveWhitespace(raw: string, replacement: string) {
  const start = raw.match(/^\s*/)?.[0] ?? '';
  const end = raw.match(/\s*$/)?.[0] ?? '';
  return `${start}${replacement}${end}`;
}

export function LegacyLanguageBridge() {
  const { language } = useLanguage();

  React.useEffect(() => {
    const translations = language === 'en' ? idToEn : enToId;

    const translateText = (node: Text) => {
      const raw = node.nodeValue ?? '';
      const trimmed = raw.trim();
      if (!trimmed) return;
      const translated = translations.get(trimmed);
      if (translated && translated !== trimmed) node.nodeValue = preserveWhitespace(raw, translated);
    };

    const translateElement = (element: Element) => {
      for (const attribute of ['placeholder', 'title', 'aria-label']) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        const translated = translations.get(value.trim());
        if (translated && translated !== value) element.setAttribute(attribute, translated);
      }
    };

    const translateTree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        translateText(root as Text);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
      if (root.nodeType === Node.ELEMENT_NODE) translateElement(root as Element);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        if (current.nodeType === Node.TEXT_NODE) translateText(current as Text);
        else translateElement(current as Element);
        current = walker.nextNode();
      }
    };

    translateTree(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') translateText(record.target as Text);
        if (record.type === 'attributes') translateElement(record.target as Element);
        record.addedNodes.forEach(translateTree);
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label'],
    });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
