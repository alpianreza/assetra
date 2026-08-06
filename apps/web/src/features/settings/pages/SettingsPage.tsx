import { useState } from 'react';
import { useWorkingDays, useUpdateWorkingDay, useHolidays, useCreateHoliday, useDeleteHoliday } from '../hooks';
import { MasterDataForm } from '../../master-data/components/MasterDataForm';
import { useAuth } from '../../auth/useAuth';

export function SettingsPage() {
  const { hasPermission } = useAuth();
  const { data: workingDaysData, isLoading: wdLoading } = useWorkingDays();
  const { data: holidaysData, isLoading: hoLoading } = useHolidays();
  const updateWorkingDay = useUpdateWorkingDay();
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [holidayFormOpen, setHolidayFormOpen] = useState(false);

  const workingDays = workingDaysData?.data ?? [];
  const holidays = holidaysData?.data ?? [];

  const daysOfWeek = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const handleToggleWorkingDay = async (dayOfWeek: number, currentStatus: 'WORKING' | 'OFF') => {
    const newStatus = currentStatus === 'WORKING' ? 'OFF' : 'WORKING';
    try {
      await updateWorkingDay.mutateAsync({ day: dayOfWeek, status: newStatus });
    } catch (e: any) {
      alert(e?.message || 'Gagal mengubah status hari kerja');
    }
  };

  const openCreateHoliday = () => { setHolidayFormOpen(true); };
  const handleDeleteHoliday = async (id: number) => {
    if (window.confirm('Hapus hari libur ini?')) {
      try {
        await deleteHoliday.mutateAsync(id);
      } catch (e: any) {
        alert(e?.message || 'Gagal menghapus hari libur');
      }
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-6">Pengaturan Hari Kerja &amp; Libur</h2>

      {/* Working Day Configuration */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-5 mb-8">
        <h3 className="font-semibold text-lg text-foreground mb-4">Konfigurasi Hari Kerja</h3>
        {wdLoading ? (
          <p className="text-muted-foreground">Memuat konfigurasi hari kerja...</p>
        ) : (
          <div className="space-y-3">
            {daysOfWeek.map((dayName, index) => {
              const dayConfig = workingDays.find((d: any) => d.dayOfWeek === index);
              const status = dayConfig?.status || 'OFF'; // Default to OFF if not configured
              const statusText = status === 'WORKING' ? 'Hari Kerja' : 'Hari Libur';
              const statusColor = status === 'WORKING' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600';

              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{dayName}</span>
                  {hasPermission('settings.working_day.manage') ? (
                    <button
                      onClick={() => handleToggleWorkingDay(index, status)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor} hover:opacity-80 transition-opacity`}
                    >
                      {statusText}
                    </button>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                      {statusText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Holiday Overrides */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-foreground">Hari Libur &amp; Pengecualian</h3>
          {hasPermission('settings.holiday.manage') && (
            <button onClick={openCreateHoliday}
              className="px-4 py-2 text-sm font-medium text-white primary primary/90 rounded-lg">
              + Tambah Hari Libur
            </button>
          )}
        </div>

        {hoLoading ? (
          <p className="text-muted-foreground">Memuat hari libur...</p>
        ) : holidays.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Tidak ada hari libur yang dikonfigurasi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {hasPermission('settings.holiday.manage') && <th className="px-4 py-3 font-medium">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {holidays.map((hol: any) => (
                  <tr key={hol.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-foreground">{new Date(hol.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-foreground">{hol.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${hol.status === 'WORKING' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>
                        {hol.status === 'WORKING' ? 'Hari Kerja' : 'Hari Libur'}
                      </span>
                    </td>
                    {hasPermission('settings.holiday.manage') && (
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteHoliday(hol.id)} className="text-red-600 hover:underline">Hapus</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {holidayFormOpen && (
        <MasterDataForm
          title="Tambah Hari Libur"
          fields={[
            { name: 'date', label: 'Tanggal', type: 'text', required: true }, // Consider a date picker later
            { name: 'name', label: 'Nama Hari Libur', type: 'text', required: true },
            { name: 'status', label: 'Status', type: 'select', options: [{ value: 'WORKING', label: 'Hari Kerja' }, { value: 'OFF', label: 'Hari Libur' }], required: true },
          ]}
          initialValues={{ date: '', name: '', status: 'OFF' }}
          onSubmit={(data) => {
            const d = data as { date: string; name: string; status: 'WORKING' | 'OFF' };
            createHoliday.mutate(d, { onSuccess: () => setHolidayFormOpen(false) });
          }}
          onClose={() => setHolidayFormOpen(false)}
          loading={createHoliday.isPending}
        />
      )}
    </div>
  );
}
