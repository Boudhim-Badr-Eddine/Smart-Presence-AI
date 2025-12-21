'use client';

export const dynamic = 'force-dynamic';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Camera, UserPlus, Save, X, Check, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import Webcam from 'react-webcam';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { LoadingButton } from '@/components/ui/spinner';
import { getApiBase, isApiConfigured } from '@/lib/config';
import { apiClient } from '@/lib/api-client';

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'trainer' | 'student';
  className?: string;
  studentId?: string;
  parentEmail?: string;
  parentPhone?: string;
  phone?: string;
  address?: string;
  jobTitle?: string;
  department?: string;
}

export default function AdminUsersPage() {
  const [enrollmentStep, setEnrollmentStep] = useState<'info' | 'facial'>('info');
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [showWebcam, setShowWebcam] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const apiBase = getApiBase();
  const envConfigured = isApiConfigured();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setHasToken(!!localStorage.getItem('spa_access_token'));
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && faceImages.length < 3) {
      setFaceImages([...faceImages, imageSrc]);
    }
  }, [faceImages]);

  const handleNext = () => {
    if (!isFormValid()) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires (*)' });
      return;
    }
    setEnrollmentStep('facial');
    setMessage(null);
  };

  const handleBack = () => {
    setEnrollmentStep('info');
    setMessage(null);
  };

  const handleSave = async () => {
    if (faceImages.length < 3) {
      setMessage({ type: 'error', text: 'Veuillez capturer au moins 3 photos du visage' });
      return;
    }

    if (!apiBase) {
      setMessage({
        type: 'error',
        text: 'API non configurée (NEXT_PUBLIC_API_BASE_URL manquant).',
      });
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('spa_access_token') : null;
    if (!token) {
      setMessage({
        type: 'error',
        text: 'Session manquante. Reconnectez-vous avant de créer un compte.',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...formData,
        imagesBase64: faceImages,
      };

      await apiClient('/api/admin/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: payload,
      });

      setMessage({ type: 'success', text: 'Utilisateur créé avec succès!' });
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'student',
      });
      setFaceImages([]);
      setEnrollmentStep('info');

      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message = detail || error?.message || 'Erreur lors de la création';
      setMessage({ type: 'error', text: String(message) });
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = () => {
    return (
      formData.firstName &&
      formData.lastName &&
      formData.email &&
      formData.password &&
      formData.password.length >= 6
    );
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-300" />
            <span>Vérifications connexion</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className={`rounded-full px-3 py-1 border ${envConfigured ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' : 'border-amber-500/40 bg-amber-500/15 text-amber-200'}`}
            >
              API base: {envConfigured ? 'OK' : 'Manquante (NEXT_PUBLIC_API_BASE_URL)'}
            </span>
            <span
              className={`rounded-full px-3 py-1 border ${hasToken ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200' : 'border-amber-500/40 bg-amber-500/15 text-amber-200'}`}
            >
              Jeton session: {hasToken ? 'OK' : 'Absent (connectez-vous)'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80">
              3 photos requises
            </span>
          </div>
        </div>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600/20">
            <UserPlus className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Gestion des Utilisateurs</h1>
            <p className="text-sm text-zinc-400">
              Créer un nouveau compte utilisateur avec enrôlement facial
            </p>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
              enrollmentStep === 'info' ? 'bg-amber-500 text-white' : 'bg-white/10 text-white'
            }`}
          >
            1
          </div>
          <div
            className={`h-1 flex-1 rounded-full ${enrollmentStep === 'facial' ? 'bg-amber-500' : 'bg-white/10'}`}
          />
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
              enrollmentStep === 'facial' ? 'bg-amber-500 text-white' : 'bg-white/10 text-white'
            }`}
          >
            2
          </div>
        </div>

        {message && (
          <Alert
            variant={message.type === 'success' ? 'success' : 'destructive'}
            title={message.type === 'success' ? 'Succès' : 'Erreur'}
            description={message.text}
            className="mb-6"
          />
        )}

        {enrollmentStep === 'info' && (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-6">
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Étape 1: Informations de base
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jean"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Dupont"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jean.dupont@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe * (min. 6 caractères)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rôle *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="trainer">Formateur</SelectItem>
                      <SelectItem value="student">Stagiaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+212 6 XX XX XX XX"
                  />
                </div>
              </div>
            </div>

            {formData.role === 'student' && (
              <div>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Informations stagiaire
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Numéro d'étudiant</Label>
                    <Input
                      id="studentId"
                      value={formData.studentId || ''}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      placeholder="DEV101-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="className">Classe</Label>
                    <Input
                      id="className"
                      value={formData.className || ''}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      placeholder="DEV101"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">Email du parent/tuteur</Label>
                    <Input
                      id="parentEmail"
                      type="email"
                      value={formData.parentEmail || ''}
                      onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      placeholder="parent@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Téléphone du parent/tuteur</Label>
                    <Input
                      id="parentPhone"
                      type="tel"
                      value={formData.parentPhone || ''}
                      onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                      placeholder="+212 6 XX XX XX XX"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Adresse
              </h2>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse complète</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Rue Example, Ville, Pays"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 pt-6">
              <Button onClick={handleNext} className="flex-1 bg-amber-500 hover:bg-amber-600">
                <ArrowRight className="mr-2 h-4 w-4" />
                Continuer vers l'enrôlement facial
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    role: 'student',
                  });
                  setMessage(null);
                }}
              >
                Réinitialiser
              </Button>
            </div>

            {!isFormValid() && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-600/20 p-3 text-sm text-amber-400">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Veuillez remplir tous les champs obligatoires (*) et vous assurer que le mot de
                  passe contient au moins 6 caractères.
                </p>
              </div>
            )}
          </div>
        )}

        {enrollmentStep === 'facial' && (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 space-y-6">
            <div>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Étape 2: Enrôlement facial
              </h2>
              <p className="text-sm text-zinc-400 mb-4">
                Utilisateur:{' '}
                <span className="font-semibold text-amber-400">
                  {formData.firstName} {formData.lastName}
                </span>
              </p>
            </div>

            <div>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white mb-2">
                  Capture de photos ({faceImages.length}/3)
                </h3>
                <p className="text-xs text-white/60 mb-2">
                  Capturez 3 angles: gauche, face, droite
                </p>
                <progress
                  className="w-full h-2 rounded-lg accent-amber-500"
                  value={faceImages.length}
                  max={3}
                />
              </div>

              {!showWebcam && faceImages.length === 0 && (
                <Button variant="outline" onClick={() => setShowWebcam(true)} className="w-full">
                  <Camera className="mr-2 h-4 w-4" />
                  Démarrer la capture
                </Button>
              )}

              {showWebcam && (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-lg border-2 border-amber-600/50 bg-white/5">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={capturePhoto}
                      disabled={faceImages.length >= 3}
                      className="flex-1 bg-amber-500 hover:bg-amber-600"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Capturer ({faceImages.length}/3)
                    </Button>
                    <Button variant="outline" onClick={() => setShowWebcam(false)}>
                      <X className="mr-2 h-4 w-4" />
                      Terminer
                    </Button>
                  </div>
                </div>
              )}

              {faceImages.length > 0 && !showWebcam && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {faceImages.map((image, index) => (
                      <div
                        key={index}
                        className="relative group overflow-hidden rounded-lg border border-white/10 h-24"
                      >
                        <Image
                          src={image}
                          alt={`Face ${index + 1}`}
                          fill
                          className="object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => setFaceImages(faceImages.filter((_, i) => i !== index))}
                            className="h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {faceImages.length < 3 && (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-600/20 p-3 text-sm text-amber-400">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>
                        Vous devez capturer au moins {3 - faceImages.length} photo(s)
                        supplémentaire(s)
                      </p>
                    </div>
                  )}

                  {faceImages.length >= 3 && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-600/20 p-3 text-sm text-green-400">
                      <Check className="h-4 w-4" />
                      Vous avez capturé suffisamment de photos!
                    </div>
                  )}

                  {faceImages.length < 3 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowWebcam(true)}
                      className="w-full"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Ajouter plus de photos ({faceImages.length}/3)
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-white/10 pt-6">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>

              <LoadingButton
                onClick={handleSave}
                disabled={faceImages.length < 3}
                loading={saving}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                Enregistrer l'utilisateur
              </LoadingButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
