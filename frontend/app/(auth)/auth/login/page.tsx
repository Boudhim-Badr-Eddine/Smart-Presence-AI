'use client';

import { useMemo, useRef, useState, type ComponentType } from 'react';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { Shield, Smile, Sparkles, Camera } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { LoadingButton } from '@/components/ui/spinner';

export const dynamic = 'force-dynamic';

const Webcam = dynamicImport(
  () => import('react-webcam').then((mod) => mod.default as unknown as ComponentType<any>),
  { ssr: false }
);

const tabs = [
  { key: 'password', label: 'Mot de passe' },
  { key: 'facial', label: 'Reconnaissance faciale' }
];

export default function LoginPage() {
  const [mode, setMode] = useState<'password' | 'facial'>('password');
  const videoConstraints = useMemo(() => ({ width: 480, height: 320, facingMode: 'user' }), []);
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const webcamRef = useRef<any>(null);

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
        <div className="flex flex-col-reverse gap-6 md:flex-row">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3 text-amber-300">
              <Sparkles size={18} /> <span className="text-sm">Bienvenue</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Smart Presence AI</h1>
              <p className="text-white/60">Choisissez votre méthode : email + mot de passe ou email + visage.</p>
            </div>

            <div className="flex gap-2 rounded-full bg-white/5 p-1 text-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMode(tab.key as 'password' | 'facial')}
                  className={`flex-1 rounded-full px-4 py-2 transition ${mode === tab.key ? 'bg-gradient-to-r from-primary-500 to-amber-500 text-white' : 'text-white/70'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setError(null);
                setLoading(true);
                try {
                  if (mode === 'password') {
                    await login(email, password);
                  } else {
                    const screenshot = webcamRef.current?.getScreenshot?.();
                    if (!screenshot) {
                      throw new Error('Veuillez capturer votre visage à droite');
                    }
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login/facial`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email, image_base64: screenshot, confidence_threshold: 0.85 })
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(() => ({}));
                      throw new Error(j?.detail || 'Échec de la connexion faciale');
                    }
                    const token = await res.json();
                    localStorage.setItem('token', token?.access_token);
                    // Redirect handled by app's auth flow if present
                  }
                } catch (err: any) {
                  setError(err?.message ?? 'Erreur de connexion');
                } finally {
                  setLoading(false);
                }
              }}
            >
              <div>
                <label className="text-sm text-white/70">Adresse e-mail</label>
                <input
                  type="email"
                  placeholder="vous@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                  required
                />
              </div>

              {mode === 'password' ? (
                <div>
                  <label className="text-sm text-white/70">Mot de passe</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                    required
                  />
                  <div className="mt-2 flex justify-between text-xs text-white/60">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" className="rounded border-white/20 bg-transparent" />
                      Se souvenir de moi
                    </label>
                    <a className="text-amber-300" href="#">Mot de passe oublié ?</a>
                  </div>
                </div>
              ) : null}

              {error && <div className="text-sm text-rose-300">{error}</div>}
              <LoadingButton type="submit" className="btn-primary w-full" loading={loading}>
                Se connecter
              </LoadingButton>
            </form>

            <p className="text-xs text-white/60">
              En vous connectant, vous acceptez les Conditions et la Politique de confidentialité.
            </p>
          </div>

          <div className="card flex-1 space-y-4 border-white/10 bg-gradient-to-br from-white/5 to-primary-500/5">
            <div className="flex items-center gap-2 text-sm text-amber-300">
              <Camera size={16} /> Facial login optionnel
            </div>
            {mode === 'facial' ? (
              <>
                <p className="text-white/70">
                  Capturez votre visage pour vous identifier. Assurez-vous que votre visage est bien éclairé et visible.
                </p>
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-xl border-2 border-primary-500/50 bg-white/5">
                    <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" videoConstraints={videoConstraints} className="aspect-video w-full" />
                  </div>
                  <div className="flex gap-2 text-xs text-white/60">
                    <Badge icon={<Shield size={14} />}>Seuil 0.85</Badge>
                    <Badge icon={<Smile size={14} />}>Anti-spoof basique</Badge>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-white/70">
                  L'authentification faciale est utilisée uniquement pour la connexion. Le pointage de présence reste manuel ou validé par le formateur.
                </p>
                <div className="rounded-lg border border-white/5 bg-white/5 p-4 text-sm text-white/70">
                  <p className="font-semibold text-white">Flux simple</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>Email</li>
                    <li>Choix mot de passe ou visage</li>
                    <li>Validation &lt; 2s, token JWT</li>
                  </ol>
                </div>
              </>
            )}
            <Link href="/" className="text-sm text-amber-300">Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
      {icon} {children}
    </span>
  );
}
