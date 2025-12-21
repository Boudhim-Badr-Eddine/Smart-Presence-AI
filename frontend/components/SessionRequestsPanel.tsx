'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Bell, CheckCircle, XCircle, Clock, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getWebSocketManager } from '@/lib/websocket';

interface SessionRequest {
  id: number;
  trainer_id: number;
  trainer_name: string;
  trainer_email: string;
  title: string;
  class_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_type?: string;
  notes?: string;
  status: string;
  admin_response?: string;
  created_at: string;
}

export default function SessionRequestsPanel() {
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadRequests();

    // Listen for real-time updates
    const ws = getWebSocketManager();
    ws.connect();
    const unsubscribe = ws.subscribe('session_request.created', () => {
      loadRequests();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await apiClient<{ requests: SessionRequest[]; total: number; unread_count: number }>(
        '/api/session-requests/all?status_filter=pending&limit=50',
        {
          method: 'GET',
          useCache: false,
        }
      );
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load session requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      setIsProcessing(true);
      await apiClient(`/api/session-requests/${requestId}/status`, {
        method: 'PUT',
        data: {
          status: 'approved',
          admin_response: adminResponse || 'Session approuvée.',
        },
      });
      setAdminResponse('');
      setSelectedRequest(null);
      loadRequests();
    } catch (err) {
      console.error('Failed to approve request:', err);
      alert('Erreur lors de l\'approbation de la demande');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      setIsProcessing(true);
      await apiClient(`/api/session-requests/${requestId}/status`, {
        method: 'PUT',
        data: {
          status: 'rejected',
          admin_response: adminResponse || 'Session rejetée.',
        },
      });
      setAdminResponse('');
      setSelectedRequest(null);
      loadRequests();
    } catch (err) {
      console.error('Failed to reject request:', err);
      alert('Erreur lors du rejet de la demande');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <p className="text-zinc-400">Chargement...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Demandes de sessions</h2>
        </div>
        <p className="text-sm text-zinc-400">Aucune demande en attente</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Demandes de sessions</h2>
        </div>
        <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-300">
          {requests.length} en attente
        </span>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {requests.map((request) => (
          <div
            key={request.id}
            className="rounded-lg border border-white/10 bg-white/2 p-4 hover:bg-white/5 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-400" />
                  <span className="font-medium text-white">{request.trainer_name}</span>
                  <span className="text-xs text-zinc-500">({request.trainer_email})</span>
                </div>
                
                <h3 className="font-semibold text-white mb-1">{request.title}</h3>
                <div className="flex flex-wrap gap-2 text-xs text-zinc-400 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {request.session_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {request.start_time} - {request.end_time}
                  </span>
                  <span className="rounded bg-blue-500/20 px-2 py-0.5 text-blue-300">
                    {request.class_name}
                  </span>
                  {request.session_type && (
                    <span className="rounded bg-purple-500/20 px-2 py-0.5 text-purple-300">
                      {request.session_type}
                    </span>
                  )}
                </div>
                
                {request.notes && (
                  <p className="text-sm text-zinc-400 mb-3 italic">&quot;{request.notes}&quot;</p>
                )}

                {selectedRequest?.id === request.id && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Réponse à envoyer au formateur (optionnel)..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {selectedRequest?.id === request.id ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Confirmer l&apos;approbation
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedRequest(null)}
                    disabled={isProcessing}
                  >
                    Annuler
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRequest(request);
                      setTimeout(() => handleReject(request.id), 100);
                    }}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeter
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
