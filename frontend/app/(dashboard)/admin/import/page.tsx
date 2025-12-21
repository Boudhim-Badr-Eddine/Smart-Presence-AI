'use client';
export const dynamic = 'force-dynamic';

import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { Upload, FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiBase } from '@/lib/config';
import { getWebSocketManager } from '@/lib/websocket';
import OnboardingTour from '@/components/OnboardingTour';
import { apiClient } from '@/lib/api-client';

export default function AdminImportPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: number; errors: number } | null>(
    null,
  );
  const [progress, setProgress] = useState<number>(0);
  const [entity, setEntity] = useState<'students' | 'trainers' | 'sessions'>('students');

  const apiBase = getApiBase();
  const authHeaders = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('spa_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleTemplateDownload = async (target: typeof entity) => {
    try {
      const blob = await apiClient<Blob>(`/api/admin/import/template?entity=${encodeURIComponent(target)}`, {
        method: 'GET',
        headers: authHeaders as Record<string, string>,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${target}_template.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setProgress(5);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await apiClient<any>(`/api/admin/import?entity=${encodeURIComponent(entity)}`, {
        method: 'POST',
        headers: authHeaders as Record<string, string>,
        data: formData,
      });
      setImportStatus({ success: result.success ?? 0, errors: result.errors ?? 0 });
      setSelectedFile(null);
      setProgress(100);
    } catch (error) {
      console.error(error);
      setImportStatus({ success: 0, errors: 1 });
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect();
    const unsub = ws.subscribe('import_progress', (payload) => {
      if (payload?.progress !== undefined) setProgress(payload.progress);
      if (payload?.status) setImportStatus(payload.status);
    });
    return () => unsub();
  }, []);

  return (
    <RoleGuard allow={['admin']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[{ label: 'Administration', href: '/admin' }, { label: 'Importer Données' }]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
            Importer Données
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Importer des étudiants, formateurs, classes et sessions via CSV/Excel
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Templates Download */}
          <div
            className="rounded-lg border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white"
            data-tour-id="import-templates"
          >
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4 flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-300" />
              Modèles à Télécharger
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Étudiants.csv', entity: 'students' },
                { label: 'Formateurs.csv', entity: 'trainers' },
                { label: 'Sessions.csv', entity: 'sessions' },
              ].map((template) => (
                <button
                  key={template.label}
                  onClick={() => handleTemplateDownload(template.entity as typeof entity)}
                  className="w-full flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100 transition text-left"
                >
                  <FileText className="h-4 w-4 text-amber-300 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                      {template.label}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                      Format standard
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-300" />
              Charger Fichier
            </h2>

            <div className="mb-4">
              <label className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                Type de données
              </label>
              <select
                value={entity}
                onChange={(e) => setEntity(e.target.value as typeof entity)}
                aria-label="Type de données"
                title="Type de données"
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white light:text-gray-900"
              >
                <option value="students">Étudiants</option>
                <option value="trainers">Formateurs</option>
                <option value="sessions">Sessions</option>
              </select>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition `}
              data-tour-id="import-drop"
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                aria-label="Fichier à importer"
                title="Fichier à importer"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="h-8 w-8 mx-auto text-zinc-400 dark:text-zinc-400 light:text-gray-400 mb-2" />
              <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                Déposer le fichier ici
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 mt-1">
                ou cliquer pour sélectionner
              </p>
              {selectedFile && <p className="text-xs text-emerald-300 mt-3">{selectedFile.name}</p>}
            </div>

            {selectedFile && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
                data-tour-id="import-submit"
              >
                {importing ? `Importation... ${progress}%` : 'Importer'}
              </button>
            )}
          </div>
        </div>

        {/* Import Result */}
        {importStatus && (
          <div className="mb-8 rounded-lg border border-emerald-600/20 bg-emerald-600/10 p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-6 w-6 text-emerald-300 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-2">
                  Importation Réussie
                </h3>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg bg-white/5 dark:bg-white/5 light:bg-white p-3">
                    <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                      Enregistrements importés
                    </p>
                    <p className="text-2xl font-bold text-emerald-300">{importStatus.success}</p>
                  </div>
                  {importStatus.errors > 0 && (
                    <div className="rounded-lg bg-red-600/10 dark:bg-red-600/10 light:bg-red-50 p-3">
                      <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                        Erreurs
                      </p>
                      <p className="text-2xl font-bold text-red-300">{importStatus.errors}</p>
                    </div>
                  )}
                  {progress > 0 && progress < 100 && (
                    <div className="rounded-lg bg-blue-600/10 p-3">
                      <p className="text-sm text-zinc-300">Progression</p>
                      <p className="text-lg font-semibold text-blue-300">{progress}%</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
          <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-300" />
            Instructions d'Importation
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="text-amber-300 font-semibold">1.</span>
              <span className="text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                Téléchargez les modèles de fichiers correspondant à vos données
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-300 font-semibold">2.</span>
              <span className="text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                Remplissez les fichiers avec vos données en respectant le format
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-300 font-semibold">3.</span>
              <span className="text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                Déposez le fichier CSV/Excel dans la zone de téléchargement
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-300 font-semibold">4.</span>
              <span className="text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                Vérifiez les résultats et les erreurs (le cas échéant)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-300 font-semibold">5.</span>
              <span className="text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                Les données seront validées et intégrées au système
              </span>
            </li>
          </ul>
        </div>

        <OnboardingTour
          tourId="import"
          steps={[
            {
              target: "[data-tour-id='import-templates']",
              title: 'Modèles prêts',
              content: 'Téléchargez les CSV/Excel standardisés.',
              placement: 'right',
            },
            {
              target: "[data-tour-id='import-drop']",
              title: 'Déposez votre fichier',
              content: 'Glissez ou cliquez pour charger le fichier à importer.',
              placement: 'bottom',
            },
            {
              target: "[data-tour-id='import-submit']",
              title: "Lancer l'import",
              content: 'Suivez la progression en temps réel (WebSocket).',
              placement: 'right',
            },
          ]}
          autoStart
        />
      </div>
    </RoleGuard>
  );
}
