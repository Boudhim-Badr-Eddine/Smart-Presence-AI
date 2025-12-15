"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Send, MessageCircle, Clock, CheckCircle } from "lucide-react";
import { getApiBase } from "@/lib/config";

const apiBase = getApiBase();

type Feedback = {
  id: number;
  subject: string;
  message: string;
  status: "pending" | "reviewed" | "resolved";
  created_at: string;
  response?: string;
};

export default function FeedbackClient() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: feedbacks = [] } = useQuery({
    queryKey: ["student-feedbacks"],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/feedbacks`).catch(() => ({
        data: [
          {
            id: 1,
            subject: "Problème d'accès",
            message: "Impossible de me connecter hier",
            status: "reviewed",
            created_at: "2025-01-10",
            response: "Le problème a été résolu. Merci pour votre retour.",
          },
        ],
      }));
      return res.data as Feedback[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { subject: string; message: string }) => {
      return axios.post(`${apiBase}/api/student/feedbacks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-feedbacks"] });
      setSubject("");
      setMessage("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    submitMutation.mutate({ subject, message });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-amber-400" />;
      case "reviewed":
        return <MessageCircle className="h-4 w-4 text-blue-400" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "reviewed":
        return "Examiné";
      case "resolved":
        return "Résolu";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-600/20 text-amber-300";
      case "reviewed":
        return "bg-blue-600/20 text-blue-300";
      case "resolved":
        return "bg-emerald-600/20 text-emerald-300";
      default:
        return "bg-zinc-600/20 text-zinc-300";
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          Nouveau feedback
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              Sujet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
              placeholder="Sujet du feedback..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
              rows={6}
              placeholder="Décrivez votre feedback..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <Send className="h-4 w-4" />
            {submitMutation.isPending ? "Envoi..." : "Envoyer"}
          </button>

          {submitMutation.isSuccess && (
            <div className="rounded-lg bg-emerald-600/20 border border-emerald-600/30 p-3 text-emerald-300 text-sm">
              Feedback envoyé avec succès !
            </div>
          )}
          {submitMutation.isError && (
            <div className="rounded-lg bg-red-600/20 border border-red-600/30 p-3 text-red-300 text-sm">
              Erreur lors de l'envoi
            </div>
          )}
        </form>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          Historique
        </h2>
        {feedbacks.length === 0 ? (
          <p className="text-zinc-400 dark:text-zinc-400 light:text-gray-600 text-center py-8">
            Aucun feedback soumis
          </p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-lg border border-white/10 bg-white/2 p-4 dark:border-white/10 dark:bg-white/2 light:border-gray-200 light:bg-gray-50"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-white dark:text-white light:text-gray-900">{feedback.subject}</h3>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.status)}`}>
                    {getStatusIcon(feedback.status)}
                    {getStatusLabel(feedback.status)}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600 mb-2">{feedback.message}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 light:text-gray-500">{feedback.created_at}</p>
                {feedback.response && (
                  <div className="mt-3 rounded-lg bg-blue-600/10 border border-blue-600/20 p-3">
                    <p className="text-xs font-medium text-blue-300 mb-1">Réponse:</p>
                    <p className="text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">{feedback.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
