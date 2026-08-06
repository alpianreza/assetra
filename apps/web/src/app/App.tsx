import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Providers } from './Providers';
import { Layout } from '../layouts/Layout';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { AuthProvider } from '../features/auth/AuthProvider';
import { DashboardPage } from '../pages/DashboardPage';
import { UsersPage } from '../features/users/pages/UsersPage';
import { RolesPage } from '../features/roles/pages/RolesPage';
import { AreasPage } from '../features/master-data/pages/AreasPage';
import { CategoriesPage } from '../features/master-data/pages/CategoriesPage';
import { ItemTypesPage } from '../features/master-data/pages/ItemTypesPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { InventoryPage } from '../features/inventory/pages/InventoryPage';
import { InventoryDetail } from '../features/inventory/pages/InventoryDetail';
import { InventoryForm } from '../features/inventory/pages/InventoryForm';
import { ChecklistMasterPage } from '../features/checklist-templates/pages/ChecklistMasterPage';
import { TemplateForm } from '../features/checklist-templates/pages/TemplateForm';
import { SessionsPage } from '../features/checklist-sessions/pages/SessionsPage';
import { QrCenterPage } from '../features/qr/pages/QrCenterPage';
import { PublicQrPage } from '../features/qr/pages/PublicQrPage';
import { CompliancePage } from '../features/compliance/pages/CompliancePage';
import { ComplianceInventoryPage } from '../features/compliance/pages/ComplianceInventoryPage';
import { ComplianceExecutionPage } from '../features/compliance/pages/ComplianceExecutionPage';
import { ComplianceResultPage } from '../features/compliance/pages/ComplianceResultPage';
import { PrintCenterPage } from '../features/reports/pages/PrintCenterPage';
import { OrganizationPage } from '../features/organization/pages/OrganizationPage';

export default function App() {
  return <Providers><Toaster position="top-right" richColors /><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<AuthProvider><Layout /></AuthProvider>}>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/inventory/new" element={<InventoryForm />} />
      <Route path="/inventory/:id" element={<InventoryDetail />} />
      <Route path="/inventory/:id/edit" element={<InventoryForm />} />
      <Route path="/inventory/:id/checklist-results/:occurrenceId" element={<ComplianceResultPage />} />
      <Route path="/checklist/templates" element={<ChecklistMasterPage />} />
      <Route path="/checklist/templates/new" element={<TemplateForm />} />
      <Route path="/checklist/templates/:id/edit" element={<TemplateForm />} />
      <Route path="/checklist/sessions" element={<SessionsPage />} />
      <Route path="/qr" element={<QrCenterPage />} />
      <Route path="/q/:publicId" element={<PublicQrPage />} />
      <Route path="/compliance" element={<CompliancePage />} />
      <Route path="/compliance/inventory/:inventoryId" element={<ComplianceInventoryPage />} />
      <Route path="/compliance/inventory/:inventoryId/execution" element={<ComplianceExecutionPage />} />
      <Route path="/reports" element={<PrintCenterPage />} />
      <Route path="/users" element={<UsersPage />} />
      <Route path="/roles" element={<RolesPage />} />
      <Route path="/master/areas" element={<AreasPage />} />
      <Route path="/master/categories" element={<CategoriesPage />} />
      <Route path="/master/item-types" element={<ItemTypesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/settings/organization" element={<OrganizationPage />} />
    </Route>
  </Routes></Providers>;
}
