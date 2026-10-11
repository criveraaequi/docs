// Aequi — Direct messages with the Aequi analyst and the CPA firm.
// Renders as a popup overlay from the top bar, expandable to fullscreen.
// One ongoing thread per contact per LLC.

import { Maximize2, Minimize2, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";import {
  getConversationsForLLC,
  getMessagesForConversation,
  getUnreadMessageCount,
  markConversationRead,
  sendMessage,
} from "@/data/grantStore";
import { useGrantStore } from "@/data/useGrantStore";
import type { ContactType, MessageRecord } from "@/data/grantStore";

interface MessagesPanelProps {
  llcId: string;
  onClose: () => void;
}

const CONTACT_META: Record<ContactType, { role: string }> = {
  analyst: { role: "Aequi Certified Analyst · CVA" },
  cpa: { role: "CPA Firm" },
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function groupByDay(messages: MessageRecord[]): { day: string; items: MessageRecord[] }[] {
  const groups: { day: string; items: MessageRecord[] }[] = [];
  for (const message of messages) {
    const day = new Date(message.createdAt).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.items.push(message);
    } else {
      groups.push({ day, items: [message] });
    }
  }
  return groups.map((group) => ({
    day: dateFormatter.format(new Date(group.items[0].createdAt)),
    items: group.items,
  }));
}

export function MessagesPanel({ llcId, onClose }: MessagesPanelProps) {
  useGrantStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const conversations = getConversationsForLLC(llcId);
  const unreadTotal = getUnreadMessageCount(llcId);
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const messages = useMemo(
    () => (selected ? getMessagesForConversation(selected.id) : []),
    [selected]
  );

  // Open the most recent unread conversation (or the first one) by default.
  useEffect(() => {
    if (selectedId && conversations.some((c) => c.id === selectedId)) return;
    if (conversations.length === 0) {
      setSelectedId(null);
      return;
    }
    const firstWithUnread = conversations.find((c) =>
      getMessagesForConversation(c.id).some((m) => m.sender === "contact" && !m.read)
    );
    setSelectedId((firstWithUnread ?? conversations[0]).id);
  }, [conversations, selectedId]);

  // Mark the opened thread read.
  useEffect(() => {
    if (!selected) return;
    void markConversationRead(selected.id).catch(() => {
      // Non-fatal: unread badge will simply persist.
    });
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the thread scrolled to the newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, selectedId]);

  const handleSend = async () => {
    if (!selected || !draft.trim() || sending) return;
    setSendError(null);
    setSending(true);
    try {
      await sendMessage(llcId, selected.contactType, draft);
      setDraft("");
    } catch {
      setSendError("Couldn't send the message. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      className={`messages-backdrop${isExpanded ? " is-expanded" : ""}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isExpanded) onClose();
      }}
    >
      <section
        className={`messages-panel${isExpanded ? " is-fullscreen" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Direct messages"
      >
        <header className="messages-header">
          <div>
            <span className="eyebrow">Direct messages</span>
            <h2>Messages {unreadTotal > 0 && <span className="messages-unread-pill">{unreadTotal} new</span>}</h2>
          </div>
          <div className="messages-header-actions">
            <button
              className="icon-button"
              type="button"
              aria-label={isExpanded ? "Collapse to popup" : "Expand to fullscreen"}
              onClick={() => setIsExpanded((value) => !value)}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button className="close-button" type="button" aria-label="Close messages" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>

        {conversations.length === 0 ? (
          <div className="messages-empty">
            <p>No conversations yet.</p>
            <small>
              Your assigned Aequi analyst and CPA firm will appear here once an engagement begins.
            </small>
          </div>
        ) : (
          <div className="messages-body">
            <ul className="conversation-list">
              {conversations.map((conversation) => {
                const thread = getMessagesForConversation(conversation.id);
                const last = thread[thread.length - 1];
                const hasUnread = thread.some(
                  (m) => m.sender === "contact" && !m.read
                );
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      className={`conversation-item${conversation.id === selected?.id ? " is-selected" : ""}`}
                      onClick={() => setSelectedId(conversation.id)}
                    >
                      <span className="conversation-avatar">{conversation.contactName.slice(0, 1)}</span>
                      <span className="conversation-meta">
                        <span className="conversation-name">{conversation.contactName}</span>
                        <span className="conversation-preview">
                          {last ? `${last.sender === "owner" ? "You: " : ""}${last.body}` : "No messages yet"}
                        </span>
                      </span>
                      {hasUnread && <span className="notification-dot" />}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="thread-pane">
              {selected ? (
                <>
                  <div className="thread-header">
                    <span className="thread-avatar">{selected.contactName.slice(0, 1)}</span>
                    <div>
                      <strong>{selected.contactName}</strong>
                      <small>{CONTACT_META[selected.contactType].role}</small>
                    </div>
                  </div>
                  <div className="thread-scroll" ref={scrollRef}>
                    {messages.length === 0 ? (
                      <p className="thread-empty">No messages yet — say hello.</p>
                    ) : (
                      groupByDay(messages).map((group) => (
                        <div key={group.day} className="thread-day-group">
                          <span className="thread-day-label">{group.day}</span>
                          {group.items.map((message) => (
                            <div
                              key={message.id}
                              className={`message-bubble ${message.sender === "owner" ? "is-owner" : "is-contact"}`}
                            >
                              <p>{message.body}</p>
                              <time>{timeFormatter.format(new Date(message.createdAt))}</time>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="thread-composer">
                    <textarea
                      value={draft}
                      placeholder={`Message ${selected.contactName}…`}
                      aria-label={`Message ${selected.contactName}`}
                      rows={isExpanded ? 3 : 2}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    {sendError && <p className="thread-send-error">{sendError}</p>}
                    <button
                      className="button-primary thread-send-button"
                      type="button"
                      disabled={!draft.trim() || sending}
                      onClick={() => void handleSend()}
                    >
                      <Send size={15} />
                      <span>{sending ? "Sending…" : "Send"}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="thread-empty-state">
                  <p>Select a conversation to start messaging.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
