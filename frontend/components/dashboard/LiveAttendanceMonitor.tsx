'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface SelfCheckin {
  id: number;
  student_id: number;
  face_confidence?: number;
  liveness_passed: boolean;
  location_verified: boolean;
  status: 'approved' | 'rejected' | 'flagged';
  created_at: string;
}

interface TeamsParticipation {
  id: number;
  student_id: number;
  join_time: string;
  leave_time?: string;
  presence_percentage: number;
  engagement_score: number;
}

interface AttendanceAlert {
  id: number;
  student_id: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  is_acknowledged: boolean;
}

interface LiveAttendanceSnapshot {
  session_id: number;
  mode: string;
  total_students_expected: number;
  total_checked_in: number;
  pending_verification: number;
  fraud_flags_count: number;
  recent_checkins: SelfCheckin[];
  recent_teams_joins: TeamsParticipation[];
}

interface LiveAttendanceMonitorProps {
  sessionId: number;
  mode: 'self_checkin' | 'teams_auto' | 'hybrid';
  refreshInterval?: number;
}

export default function LiveAttendanceMonitor({
  sessionId,
  mode,
  refreshInterval = 5000,
}: LiveAttendanceMonitorProps) {
  const [snapshot, setSnapshot] = useState<LiveAttendanceSnapshot | null>(null);
  const [alerts, setAlerts] = useState<AttendanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch live attendance data
  const fetchLiveData = async () => {
    try {
      setError(null);

      const snapshotRes = await fetch(`/api/smart-attendance/sessions/${sessionId}/live`);
      if (!snapshotRes.ok) throw new Error('Failed to fetch attendance snapshot');
      const snapshotData = await snapshotRes.json();
      setSnapshot(snapshotData);

      const alertsRes = await fetch('/api/smart-attendance/alerts?unacknowledged_only=true');
      if (!alertsRes.ok) throw new Error('Failed to fetch alerts');
      const alertsData = await alertsRes.json();
      setAlerts(alertsData);

      setLastRefresh(new Date());
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    }
  };

  // Auto-refresh
  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, refreshInterval);
    return () => clearInterval(interval);
  }, [sessionId, refreshInterval]);

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      const response = await fetch(`/api/smart-attendance/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_taken: 'Reviewed by trainer' }),
      });

      if (!response.ok) throw new Error('Failed to acknowledge alert');
      
      // Refresh alerts
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  if (isLoading && !snapshot) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Suivi en Direct</h2>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">
            Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
          </span>
          <Button size="sm" variant="outline" onClick={fetchLiveData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      {snapshot && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-sm text-gray-600">Attendus</p>
                <p className="text-3xl font-bold">{snapshot.total_students_expected}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-gray-600">Enregistrés</p>
                <p className="text-3xl font-bold">{snapshot.total_checked_in}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-sm text-gray-600">En attente</p>
                <p className="text-3xl font-bold">{snapshot.pending_verification}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                <p className="text-sm text-gray-600">Fraude</p>
                <p className="text-3xl font-bold">{snapshot.fraud_flags_count}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Alertes Actives ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start justify-between gap-4 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{alert.message}</p>
                    <p className="text-xs text-gray-600">
                      Type: {alert.alert_type} • Sévérité: {alert.severity}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                  >
                    Reconnaître
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Check-ins */}
      {snapshot && snapshot.recent_checkins.length > 0 && mode !== 'teams_auto' && (
        <Card>
          <CardHeader>
            <CardTitle>Enregistrements Récents</CardTitle>
            <CardDescription>Derniers auto-enregistrements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {snapshot.recent_checkins.map((checkin) => (
                <div key={checkin.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">Étudiant #{checkin.student_id}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(checkin.created_at).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {checkin.status === 'approved' && (
                      <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                        ✓ Approuvé
                      </Badge>
                    )}
                    {checkin.status === 'flagged' && (
                      <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                        ⚠ Signalé
                      </Badge>
                    )}
                    {checkin.status === 'rejected' && (
                      <Badge variant="outline" className="bg-red-50 border-red-300 text-red-700">
                        ✗ Rejeté
                      </Badge>
                    )}
                    {checkin.face_confidence && (
                      <Badge variant="secondary">
                        {(checkin.face_confidence * 100).toFixed(0)}% confiance
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams Participation */}
      {snapshot && snapshot.recent_teams_joins.length > 0 && mode !== 'self_checkin' && (
        <Card>
          <CardHeader>
            <CardTitle>Participation Teams</CardTitle>
            <CardDescription>Activité Teams actuelle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {snapshot.recent_teams_joins.map((participation) => (
                <div key={participation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">Étudiant #{participation.student_id}</p>
                    <p className="text-xs text-gray-600">
                      Engagement: {participation.engagement_score}/100
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {participation.presence_percentage.toFixed(0)}% présent
                    </Badge>
                    {!participation.leave_time && (
                      <Badge className="bg-green-500">En ligne</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
