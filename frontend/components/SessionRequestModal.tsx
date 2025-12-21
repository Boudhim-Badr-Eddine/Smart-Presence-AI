'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { Send, Calendar, Clock, BookOpen } from 'lucide-react';

interface SessionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SessionRequestModal({ isOpen, onClose, onSuccess }: SessionRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    class_name: '',
    session_date: '',
    start_time: '',
    end_time: '',
    session_type: 'course',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient('/api/session-requests', {
        method: 'POST',
        data: formData,
      });

      // Reset form
      setFormData({
        title: '',
        class_name: '',
        session_date: '',
        start_time: '',
        end_time: '',
        session_type: 'course',
        notes: '',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la demande de session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" />
            Demander une nouvelle session
          </DialogTitle>
          <DialogDescription>
            Remplissez ce formulaire pour demander aux administrateurs de créer une session pour vous.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Titre de la session *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ex: Introduction à React"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="class_name">Classe *</Label>
              <Input
                id="class_name"
                value={formData.class_name}
                onChange={(e) => handleChange('class_name', e.target.value)}
                placeholder="Ex: DEV-2024"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="session_type">Type de session</Label>
              <select
                id="session_type"
                value={formData.session_type}
                onChange={(e) => handleChange('session_type', e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm"
                aria-label="Type de session"
              >
                <option value="course">Cours</option>
                <option value="td">TD</option>
                <option value="tp">TP</option>
                <option value="exam">Examen</option>
                <option value="workshop">Atelier</option>
              </select>
            </div>

            <div>
              <Label htmlFor="session_date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="session_date"
                type="date"
                value={formData.session_date}
                onChange={(e) => handleChange('session_date', e.target.value)}
                required
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="start_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Début *
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleChange('start_time', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_time">Fin *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleChange('end_time', e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes / Remarques</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Ajoutez des détails supplémentaires pour les administrateurs..."
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
