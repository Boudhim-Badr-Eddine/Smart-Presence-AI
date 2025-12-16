'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Loader2,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface FraudDetection {
  id: number;
  student_id: number;
  session_id?: number;
  checkin_id?: number;
  fraud_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence?: Record<string, any>;
  description: string;
  is_resolved: boolean;
  resolved_by_user_id?: number;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export default function FraudDetectionPanel() {
  const [fraudCases, setFraudCases] = useState<FraudDetection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<FraudDetection | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Fetch fraud cases
  const fetchFraudCases = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const query = filterSeverity !== 'all' ? `?severity=${filterSeverity}` : '?resolved=false';
      const response = await fetch(`/api/smart-attendance/fraud-detections${query}`);

      if (!response.ok) {
        throw new Error('Failed to fetch fraud detections');
      }

      const data = await response.json();
      setFraudCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFraudCases();
  }, [filterSeverity]);

  // Resolve fraud case
  const handleResolveFraud = async () => {
    if (!selectedCase || !resolutionNotes.trim()) {
      setError('Veuillez ajouter des notes de résolution');
      return;
    }

    try {
      setIsResolving(true);
      const response = await fetch(
        `/api/smart-attendance/fraud-detections/${selectedCase.id}/resolve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution_notes: resolutionNotes }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve fraud case');
      }

      // Refresh list
      fetchFraudCases();
      setSelectedCase(null);
      setResolutionNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsResolving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const fraudTypeDescriptions: Record<string, string> = {
    proxy_attendance: 'Quelqu\'un a peut-être enregistré en votre nom',
    screenshot_fraud: 'Tentative d\'utiliser une capture d\'écran au lieu d\'une photo en direct',
    location_spoof: 'La localisation GPS semble falsifiée',
    duplicate_attempt: 'Plusieurs tentatives d\'enregistrement en peu de temps',
  };

  const unresolved = fraudCases.filter(c => !c.is_resolved);
  const resolved = fraudCases.filter(c => c.is_resolved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Détection de Fraude</h2>
        <Button size="sm" variant="outline" onClick={fetchFraudCases} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filterSeverity === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterSeverity('all')}
        >
          Tous
        </Button>
        {['critical', 'high', 'medium', 'low'].map((sev) => (
          <Button
            key={sev}
            variant={filterSeverity === sev ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterSeverity(sev)}
            className={filterSeverity === sev ? getSeverityColor(sev) : ''}
          >
            {sev.charAt(0).toUpperCase() + sev.slice(1)}
          </Button>
        ))}
      </div>

      {isLoading && fraudCases.length === 0 ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <>
          {/* Unresolved Cases */}
          {unresolved.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  Cas Non Résolus ({unresolved.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unresolved.map((fraud) => (
                    <div
                      key={fraud.id}
                      className="flex items-start justify-between p-4 bg-white rounded-lg border-l-4 border-red-500"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold">
                            Fraude #{fraud.id} - Étudiant #{fraud.student_id}
                          </p>
                          <Badge className={getSeverityColor(fraud.severity)}>
                            {fraud.severity.toUpperCase()}
                          </Badge>
                        </div>

                        <p className="text-sm font-medium text-gray-700 mb-1">
                          {fraudTypeDescriptions[fraud.fraud_type] || fraud.fraud_type}
                        </p>

                        <p className="text-sm text-gray-600 mb-2">{fraud.description}</p>

                        {fraud.evidence && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                              Détails techniques
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                              {JSON.stringify(fraud.evidence, null, 2)}
                            </pre>
                          </details>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          Détecté: {new Date(fraud.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => setSelectedCase(fraud)}
                        className="ml-4 whitespace-nowrap"
                      >
                        Résoudre
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolved Cases */}
          {resolved.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Cas Résolus ({resolved.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resolved.map((fraud) => (
                    <div
                      key={fraud.id}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg opacity-75"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-700">
                            Fraude #{fraud.id} - Étudiant #{fraud.student_id}
                          </p>
                          <Badge variant="secondary">Résolu</Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-2">{fraud.description}</p>

                        {fraud.resolution_notes && (
                          <div className="text-sm bg-white p-2 rounded border-l-2 border-green-500 mb-2">
                            <p className="text-xs font-semibold text-gray-700">Notes de résolution:</p>
                            <p className="text-xs text-gray-600">{fraud.resolution_notes}</p>
                          </div>
                        )}

                        <p className="text-xs text-gray-500">
                          Résolu: {fraud.resolved_at ? new Date(fraud.resolved_at).toLocaleString('fr-FR') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {fraudCases.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500">Aucun cas de fraude détecté.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Resolution Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Résoudre Cas de Fraude</DialogTitle>
            <DialogDescription>
              Fraude #{selectedCase?.id} - Étudiant #{selectedCase?.student_id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Description:</p>
              <p className="text-sm text-gray-700">{selectedCase?.description}</p>
            </div>

            <div>
              <label className="text-sm font-semibold">Notes de résolution:</label>
              <Textarea
                placeholder="Décrivez les mesures prises (avertissement, révocation du droit de présence, etc.)"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedCase(null)}
                disabled={isResolving}
              >
                Annuler
              </Button>
              <Button
                onClick={handleResolveFraud}
                disabled={isResolving || !resolutionNotes.trim()}
              >
                {isResolving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Résolution...
                  </>
                ) : (
                  'Marquer Résolu'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
