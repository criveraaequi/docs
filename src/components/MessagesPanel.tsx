// Aequi — Direct messages with the Aequi analyst and the CPA firm.
// Renders as a popup overlay from the top bar, expandable to fullscreen.
// One ongoing thread per contact per LLC.

import { ChevronDown, Maximize2, Minimize2, Send, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getConversationsForLLC,
  getMessagesForConversation,
  getUnreadMessageCount,
  markConversationRead,
  sendMessage,
  sendOwnerToEmployeeMessage,
} from "@/data/grantStore";
import { useGrantStore } from "@/data/useGrantStore";
import { getEmployeeRecordById, getEmployeeRecords } from "@/data/employeeStore";
import type { EmployeeRecord } from "@/data/employeeStore";
import type { ContactType, MessageRecord } from "@/data/grantStore";

interface MessagesPanelProps {
  llcId: string;
  onClose: () => void;
}

const CONTACT_META: Record<ContactType, { role: string }> = {
  analyst: { role: "Aequi Certified Analyst · CVA" },
  cpa: { role: "CPA Firm" },
  employer: { role: "Company — Equity Administrator" },
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
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const [previewEmployeeId, setPreviewEmployeeId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const conversations = getConversationsForLLC(llcId);
  const unreadTotal = getUnreadMessageCount(llcId);
  // Employee threads that were opened but never messaged stay out of the list.
  const visibleConversations = conversations.filter(
    (c) => c.employeeId === null || getMessagesForConversation(c.id).length > 0
  );
  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const previewEmployee = previewEmployeeId ? getEmployeeRecordById(previewEmployeeId) : null;
  const messages = useMemo(
    () => (selected ? getMessagesForConversation(selected.id) : []),
    [selected]
  );

  // Employees who don't have a real thread yet — once a message is sent they
  // move up into the conversation list and leave this picker.
  const activeEmployees = getEmployeeRecords().filter(
    (employee) => employee.employmentStatus === "active"
  );
  const employeesWithThreads = new Set(
    visibleConversations.map((c) => c.employeeId).filter((id): id is string => id !== null)
  );
  const availableEmployees = activeEmployees.filter(
    (employee) => !employeesWithThreads.has(employee.id)
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
    if (!draft.trim() || sending) return;
    setSendError(null);
    setSending(true);
    try {
      if (previewEmployeeId) {
        // First message creates the stored thread; until then it's draft-only.
        const record = await sendOwnerToEmployeeMessage(llcId, previewEmployeeId, draft);
        setPreviewEmployeeId(null);
        setSelectedId(record.conversationId);
      } else if (selected?.employeeId) {
        await sendOwnerToEmployeeMessage(llcId, selected.employeeId, draft);
      } else if (selected) {
        await sendMessage(llcId, selected.contactType, draft);
      }
      setDraft("");
    } catch {
      setSendError("Couldn't send the message. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const handlePreviewChat = (employee: EmployeeRecord) => {
    setPreviewEmployeeId(employee.id);
    setEmployeesOpen(false);
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

        <div className="messages-body">
          <div className="conversation-column">
            <ul className="conversation-list">
              {visibleConversations.length === 0 && (
                <li className="conversation-empty-note">
                  No conversations yet — pick an employee below or wait for your analyst to reach out.
                </li>
              )}
              {visibleConversations.map((conversation) => {
                const thread = getMessagesForConversation(conversation.id);
                const last = thread[thread.length - 1];
                const hasUnread = thread.some(
                  (m) => m.sender === "contact" && !m.read
                );
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      className={`conversation-item${conversation.id === selected?.id && !previewEmployee ? " is-selected" : ""}`}
                      onClick={() => {
                        setSelectedId(conversation.id);
                        setPreviewEmployeeId(null);
                      }}
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

            <div className={`employees-picker${employeesOpen ? " is-open" : ""}`}>
              <button
                className="employees-picker-toggle"
                type="button"
                aria-expanded={employeesOpen}
                onClick={() => setEmployeesOpen((open) => !open)}
              >
                <Users size={14} />
                <span>Employees</span>
                <ChevronDown size={14} className="employees-picker-chevron" />
              </button>
              {employeesOpen && (
                <ul className="employees-picker-list">
                  {availableEmployees.length === 0 && (
                    <li className="employees-picker-note">
                      {activeEmployees.length === 0
                        ? "Add employees from the Employees page first."
                        : "You're chatting with everyone on the team."}
                    </li>
                  )}
                  {availableEmployees.map((employee) => (
                    <li key={employee.id}>
                      <button
                        className="employees-picker-item"
                        type="button"
                        onClick={() => handlePreviewChat(employee)}
                      >
                        <span className="conversation-avatar employees-picker-avatar">
                          {employee.name.slice(0, 1)}
                        </span>
                        <span className="employees-picker-meta">
                          <strong>{employee.name}</strong>
                          <small>{employee.roleOrPosition}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
            <div className="thread-pane">
              {previewEmployee ? (
                <EmployeeDraftThread
                  employee={previewEmployee}
                  draft={draft}
                  sending={sending}
                  sendError={sendError}
                  onDraftChange={setDraft}
                  onSend={() => void handleSend()}
                  onKeyDown={handleKeyDown}
                />
              ) : selected ? (
                <>
                  <div className="thread-header">
                    <span className="thread-avatar">{selected.contactName.slice(0, 1)}</span>
                    <div>
                      <strong>{selected.contactName}</strong>
                      <small>
                        {selected.employeeId
                          ? getEmployeeRecordById(selected.employeeId)?.roleOrPosition ??
                            CONTACT_META[selected.contactType].role
                          : CONTACT_META[selected.contactType].role}
                      </small>
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
      </section>
    </div>
  );
}

interface DraftThreadProps {
  employee: EmployeeRecord;
  draft: string;
  sending: boolean;
  sendError: string | null;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

/** Draft view for a picked employee — nothing is stored until a message is sent. */
function EmployeeDraftThread({
  employee,
  draft,
  sending,
  sendError,
  onDraftChange,
  onSend,
  onKeyDown,
}: DraftThreadProps) {
  return (
    <>
      <div className="thread-header">
        <span className="thread-avatar">{employee.name.slice(0, 1)}</span>
        <div>
          <strong>{employee.name}</strong>
          <small>{employee.roleOrPosition}</small>
        </div>
      </div>
      <div className="thread-scroll">
        <p className="thread-empty">No messages yet — say hello.</p>
      </div>
      <div className="thread-composer">
        <textarea
          value={draft}
          placeholder={`Message ${employee.name}…`}
          aria-label={`Message ${employee.name}`}
          rows={3}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {sendError && <p className="thread-send-error">{sendError}</p>}
        <button
          className="button-primary thread-send-button"
          type="button"
          disabled={!draft.trim() || sending}
          onClick={onSend}
        >
          <Send size={15} />
          <span>{sending ? "Sending…" : "Send"}</span>
        </button>
      </div>
    </>
  );
}
