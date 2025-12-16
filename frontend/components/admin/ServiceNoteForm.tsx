"use client";
import React, { useEffect, useState } from "react";

interface TrainerOption {
  id: number;
  name: string;
  email: string;
}

export default function ServiceNoteForm() {
  const [title, setTitle] = useState("");
  const [messageType, setMessageType] = useState<"service_note" | "official_message">(
    "service_note",
  );
  const [body, setBody] = useState("");
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [selectedTrainers, setSelectedTrainers] = useState<number[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [resultKind, setResultKind] = useState<"success" | "error" | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const allowedExtensions = ["pdf", "doc", "docx", "odt", "xlsx", "xls", "ppt", "pptx", "png", "jpg", "jpeg"];
  const maxSizeMB = 10;

  useEffect(() => {
    // Load trainers (paginated, take first page)
    const token = localStorage.getItem("spa_access_token");
    fetch(`${apiUrl}/api/admin/trainers?page=1&page_size=100`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        const items = data.items || [];
        setTrainers(items.map((i: any) => ({ id: i.id, name: i.name, email: i.email })));
      })
      .catch(() => {});

    // Load classes (distinct from sessions)
    fetch(`${apiUrl}/api/admin/classes`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setClasses(data.classes || []))
      .catch(() => {});
  }, [apiUrl]);

  const toggleTrainer = (id: number) => {
    setSelectedTrainers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleClass = (name: string) => {
    setSelectedClasses((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResultMsg(null);
    setResultKind(null);

    // Client-side validation for attachments
    if (files) {
      const fileArr = Array.from(files);
      for (const f of fileArr) {
        const ext = f.name.split(".").pop()?.toLowerCase() || "";
        if (!allowedExtensions.includes(ext)) {
          setResultMsg(`Extension non autorisee: ${ext || "inconnue"}`);
          setResultKind("error");
          setSubmitting(false);
          return;
        }
        if (f.size > maxSizeMB * 1024 * 1024) {
          setResultMsg(`Fichier trop volumineux (> ${maxSizeMB}MB): ${f.name}`);
          setResultKind("error");
          setSubmitting(false);
          return;
        }
      }
    }

    const fd = new FormData();
    fd.append("title", title);
    fd.append("message_type", messageType);
    if (body) fd.append("body", body);
    if (selectedTrainers.length) fd.append("trainer_ids", selectedTrainers.join(","));
    if (selectedClasses.length) fd.append("class_names", selectedClasses.join(","));
    if (files) {
      Array.from(files).forEach((f) => fd.append("files", f));
    }

    try {
      const token = localStorage.getItem("spa_access_token");
      const res = await fetch(`${apiUrl}/api/admin/messages`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      setResultMsg("Message envoyé avec succès ✉️");
      setResultKind("success");
      setTitle("");
      setBody("");
      setSelectedTrainers([]);
      setSelectedClasses([]);
      setFiles(null);
    } catch (err: any) {
      setResultMsg(`Erreur: ${err.message || "Échec de l'envoi"}`);
      setResultKind("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-800 p-4">
      <div>
        <label className="block text-sm text-zinc-300">Titre</label>
        <input
          className="mt-1 w-full rounded bg-zinc-900 p-2 text-white outline-none ring-amber-500 focus:ring-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note de service / Message officiel"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-300">Type</label>
        <select
          className="mt-1 w-full rounded bg-zinc-900 p-2 text-white"
          value={messageType}
          onChange={(e) => setMessageType(e.target.value as any)}
        >
          <option value="service_note">Note de service</option>
          <option value="official_message">Message officiel</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-zinc-300">Message (optionnel)</label>
        <textarea
          className="mt-1 w-full rounded bg-zinc-900 p-2 text-white"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Texte complémentaire qui accompagne la pièce jointe"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-300">Pièce(s) jointe(s)</label>
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="mt-1 w-full text-sm text-zinc-300 file:mr-4 file:rounded file:border-0 file:bg-amber-600 file:px-3 file:py-1 file:text-white hover:file:bg-amber-500"
          accept=".pdf,.doc,.docx,.odt,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium text-white">Formateurs cibles</p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-zinc-800 p-2">
            {trainers.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={selectedTrainers.includes(t.id)}
                  onChange={() => toggleTrainer(t.id)}
                />
                <span>{t.name}</span>
                <span className="text-xs text-zinc-500">({t.email})</span>
              </label>
            ))}
            {trainers.length === 0 && (
              <p className="text-sm text-zinc-500">Aucun formateur chargé…</p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-white">Classes concernées</p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-zinc-800 p-2">
            {classes.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" checked={selectedClasses.includes(c)} onChange={() => toggleClass(c)} />
                <span>{c}</span>
              </label>
            ))}
            {classes.length === 0 && (
              <p className="text-sm text-zinc-500">Aucune classe trouvée…</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {submitting ? "Envoi…" : "Envoyer"}
        </button>
        {resultMsg && (
          <span className={`text-sm ${resultKind === "error" ? "text-rose-400" : "text-emerald-300"}`}>
            {resultMsg}
          </span>
        )}
      </div>
    </form>
  );
}
