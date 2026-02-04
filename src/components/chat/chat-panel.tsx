'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { ChatMessage, COMMANDS } from '@/lib/types';
import {
  MessageSquare,
  Send,
  X,
  ChevronRight,
  Bot,
  User,
  Terminal,
  Loader2,
  Sparkles,
} from 'lucide-react';

// ── Command autocomplete ──

type Command = typeof COMMANDS[number];

function parseCommandInput(input: string): { prefix: string; matches: Command[] } | null {
  if (!input.startsWith('/')) return null;
  const prefix = input.slice(1).toLowerCase();
  if (prefix.includes(' ')) return null; // already past the command name
  const matches = COMMANDS.filter(c => c.name.startsWith(prefix));
  return matches.length > 0 ? { prefix, matches } : null;
}

function CommandAutocomplete({
  input,
  onSelect,
}: {
  input: string;
  onSelect: (command: string) => void;
}) {
  const result = parseCommandInput(input);
  if (!result) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border overflow-hidden"
      style={{
        background: 'var(--color-bg-tertiary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {result.matches.map((cmd) => (
        <button
          key={cmd.name}
          onClick={() => onSelect(`/${cmd.name} `)}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 transition-colors text-left"
        >
          <Terminal size={14} className="text-cyan-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-mono text-cyan-300">{cmd.usage}</span>
            <span className="ml-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {cmd.help}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Message bubble ──

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const agent = useAppStore((s) => s.getAgentById(message.agentId || ''));

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div
          className="text-xs px-3 py-1 rounded-full"
          style={{
            background: 'var(--color-bg-tertiary)',
            color: 'var(--color-text-muted)',
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-medium mt-0.5"
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
            : `linear-gradient(135deg, ${agent?.color || '#06b6d4'}, ${agent?.color || '#a855f7'})`,
        }}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Content */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {/* Agent name */}
        {!isUser && (
          <span className="text-[10px] font-medium px-1" style={{ color: agent?.color || 'var(--color-text-muted)' }}>
            {agent?.name || message.agentId || 'Agent'}
          </span>
        )}

        <div
          className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
            isUser
              ? 'rounded-br-sm'
              : 'rounded-bl-sm'
          }`}
          style={{
            background: isUser
              ? 'rgba(6, 182, 212, 0.15)'
              : 'var(--color-bg-tertiary)',
            borderLeft: !isUser ? `2px solid ${agent?.color || 'var(--color-accent-cyan)'}` : undefined,
          }}
        >
          {/* Command badge */}
          {message.command && (
            <div className="flex items-center gap-1.5 mb-1">
              <Terminal size={12} className="text-cyan-400" />
              <span className="font-mono text-xs text-cyan-300">/{message.command.name}</span>
            </div>
          )}

          {/* Message content */}
          <div
            className="whitespace-pre-wrap break-words"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {message.content}
          </div>

          {/* Pending indicator */}
          {message.pending && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Loader2 size={12} className="animate-spin text-cyan-400" />
              <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                thinking...
              </span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span
          className="text-[10px] px-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── Main chat panel ──

export function ChatPanel() {
  const { chatOpen, toggleChat, chatMessages, sendChatMessage } = useAppStore();
  const [input, setInput] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Focus input when panel opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [chatOpen]);

  // Cmd+J toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        toggleChat();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleChat]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendChatMessage(trimmed);
    setInput('');
    setShowAutocomplete(false);
  }, [input, sendChatMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    },
    [handleSend]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    setShowAutocomplete(val.startsWith('/') && !val.slice(1).includes(' '));
  }, []);

  const handleCommandSelect = useCallback((cmd: string) => {
    setInput(cmd);
    setShowAutocomplete(false);
    inputRef.current?.focus();
  }, []);

  // Floating button when closed
  if (!chatOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 glow-cyan"
        style={{
          background: 'linear-gradient(135deg, #06b6d4, #a855f7)',
        }}
        title="Open Chat (⌘J)"
      >
        <MessageSquare size={20} />
      </button>
    );
  }

  return (
    <div
      className="fixed right-0 top-0 h-full z-50 flex flex-col border-l shadow-2xl"
      style={{
        width: '380px',
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 h-14 border-b shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <div>
            <span className="font-semibold text-sm">Chat</span>
            <span className="text-[10px] ml-2" style={{ color: 'var(--color-text-muted)' }}>
              ⌘J
            </span>
          </div>
        </div>
        <button
          onClick={toggleChat}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--color-bg-tertiary)' }}
            >
              <Terminal size={28} className="text-cyan-400" />
            </div>
            <p className="text-sm font-medium mb-1">Command Surface</p>
            <p className="text-xs max-w-[240px]" style={{ color: 'var(--color-text-muted)' }}>
              Type <span className="font-mono text-cyan-400">/</span> for commands, or chat naturally with your agents.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              {COMMANDS.slice(0, 4).map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => handleCommandSelect(`/${cmd.name} `)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors hover:bg-white/5"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  /{cmd.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 pb-3">
        <div className="relative">
          {showAutocomplete && (
            <CommandAutocomplete input={input} onSelect={handleCommandSelect} />
          )}
          <div
            className="flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors focus-within:border-cyan-500/50"
            style={{
              background: 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
            }}
          >
            <ChevronRight size={14} className="text-cyan-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type / for commands..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-500"
              style={{ color: 'var(--color-text-primary)' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-1 rounded-md transition-all disabled:opacity-30 hover:bg-white/10"
              style={{ color: 'var(--color-accent-cyan)' }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
