// Aequi — Employee-private direct messages with their employer (LLC owner).
// Mirrors the owner MessagesPanel design but scoped to one employee's own
// thread with their company; the owner's conversation list does not show
// employee threads in this build (role map refinement pending).
import { Maximize2, Minimize2, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getEmployeeMessages,
  markEmployeeConversationRead,
  sendEmployeeMessage,
} from "@/data/grantStore";
import { useGrantStore } from "@/data/useGrantStore";
import type { MessageRecord } from "@/data/grantStore";

interface EmployeeMessagesPanelProps {
  llcId: string;
  employeeId: string;
  onClose: () => void;
}

const EMPLOYER_META = {
  name: "Your employer",
  role: "Company — Equity Administrator",
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

export function EmployeeMessagesPanel({
  llcId,
  employeeId,
  onClose,
}: EmployeeMessagesPanelProps) {
  useGrantStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const contact = EMPLOYER_META;
  const messages = getEmployeeMessages(llcId, employeeId, "employer");

  useEffect(() => {
    void markEmployeeConversationRead(llcId, employeeId, "employer").catch(() => {
      // Non-fatal: unread badge will simply persist.
    });
  }, [llcId, employeeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSendError(null);
    setSending(true);
    try {
      await sendEmployeeMessage(llcId, employeeId, "employer", draft);
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
            <h2>Messages</h2>
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

        <div className="thread-pane">
          <div className="thread-header">
            <span className="thread-avatar">{contact.name.slice(0, 1)}</span>
            <div>
              <strong>{contact.name}</strong>
              <small>{contact.role}</small>
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
                      className={`message-bubble ${message.sender === "employee" ? "is-owner" : "is-contact"}`}
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
              placeholder={`Message ${contact.name}…`}
              aria-label={`Message ${contact.name}`}
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
        </div>
      </section>
    </div>
  );
}
