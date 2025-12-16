'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Send, Search, User, Circle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getApiBase } from '@/lib/config';

const apiBase = getApiBase();

type Thread = {
  id: number;
  participant_name: string;
  participant_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

type Message = {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  created_at: string;
  read: boolean;
};

export default function MessagesClient() {
  const { user } = useAuth();
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: threads = [] } = useQuery({
    queryKey: ['message-threads'],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/messages/threads`).catch(() => ({
        data: [
          {
            id: 1,
            participant_name: 'M. Ahmed',
            participant_role: 'trainer',
            last_message: 'Bonjour, comment puis-je vous aider?',
            last_message_at: '2025-01-14T10:30:00Z',
            unread_count: 2,
          },
          {
            id: 2,
            participant_name: 'Lamiae Idrissi',
            participant_role: 'student',
            last_message: 'Merci pour la réponse',
            last_message_at: '2025-01-13T15:20:00Z',
            unread_count: 0,
          },
        ],
      }));
      return res.data as Thread[];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedThread],
    queryFn: async () => {
      if (!selectedThread) return [];
      const res = await axios.get(`${apiBase}/api/messages/thread/${selectedThread}`).catch(() => ({
        data: [
          {
            id: 1,
            sender_id: 2,
            sender_name: 'M. Ahmed',
            content: 'Bonjour, comment puis-je vous aider?',
            created_at: '2025-01-14T10:30:00Z',
            read: true,
          },
          {
            id: 2,
            sender_id: 1,
            sender_name: 'Vous',
            content: "J'ai une question sur le cours de demain",
            created_at: '2025-01-14T10:32:00Z',
            read: true,
          },
        ],
      }));
      return res.data as Message[];
    },
    enabled: selectedThread !== null,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { thread_id: number; content: string }) => {
      return axios.post(`${apiBase}/api/messages/send`, data);
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['messages', selectedThread] });
      const previous = queryClient.getQueryData<Message[]>(['messages', selectedThread]);

      const optimisticMessage: Message = {
        id: Date.now(),
        sender_id: user?.id || 0,
        sender_name: 'Vous',
        content: data.content,
        created_at: new Date().toISOString(),
        read: false,
      };

      queryClient.setQueryData<Message[]>(['messages', selectedThread], (old) => [
        ...(old || []),
        optimisticMessage,
      ]);

      return { previous };
    },
    onError: (err, data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['messages', selectedThread], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedThread] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedThread) return;
    sendMutation.mutate({ thread_id: selectedThread, content: messageInput });
    setMessageInput('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filteredThreads = threads.filter((t) =>
    t.participant_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedThreadData = threads.find((t) => t.id === selectedThread);

  return (
    <div className="grid gap-4 md:grid-cols-3 h-[calc(100vh-16rem)]">
      {/* Thread List */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden flex flex-col">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredThreads.length === 0 ? (
            <p className="text-zinc-400 dark:text-zinc-400 light:text-gray-600 text-center py-8 text-sm">
              Aucun message
            </p>
          ) : (
            filteredThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className={`w-full text-left rounded-lg p-3 transition ${
                  selectedThread === thread.id
                    ? 'bg-blue-600/20 border border-blue-600/30'
                    : 'bg-white/2 hover:bg-white/5 dark:bg-white/2 dark:hover:bg-white/5 light:bg-gray-50 light:hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400" />
                    <h3 className="font-medium text-white dark:text-white light:text-gray-900 truncate">
                      {thread.participant_name}
                    </h3>
                  </div>
                  {thread.unread_count > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                      {thread.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 truncate mb-1">
                  {thread.last_message}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 light:text-gray-500">
                  {new Date(thread.last_message_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message View */}
      <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white overflow-hidden flex flex-col">
        {selectedThread ? (
          <>
            <div className="border-b border-white/10 dark:border-white/10 light:border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-zinc-400" />
                <div>
                  <h2 className="font-semibold text-white dark:text-white light:text-gray-900">
                    {selectedThreadData?.participant_name}
                  </h2>
                  <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600 capitalize">
                    {selectedThreadData?.participant_role === 'trainer' ? 'Formateur' : 'Étudiant'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => {
                const isOwn = message.sender_name === 'Vous' || message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-white dark:bg-white/10 dark:text-white light:bg-gray-200 light:text-gray-900'
                      }`}
                    >
                      {!isOwn && (
                        <p className="text-xs font-medium mb-1 opacity-75">{message.sender_name}</p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/10 dark:border-white/10 light:border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Écrire un message..."
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendMutation.isPending || !messageInput.trim()}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  );
}
