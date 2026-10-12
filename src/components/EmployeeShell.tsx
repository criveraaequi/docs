// Aequi — Employee portal shell: top bar for the signed-in (simulated)
// employee: their name, their company, messages, notifications, and the
// "View as" switcher that stands in for real sign-in during the closed beta.
import { Bell, Menu, MessageSquare, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  getEmployeeUnreadMessageCount,
  markEmployeeConversationRead,
} from "@/data/grantStore";
import { useGrantStore } from "@/data/useGrantStore";
import type { Employee } from "@/data/types";
import { EmployeeMessagesPanel } from "@/components/EmployeeMessagesPanel";
import { ViewAsSwitcher } from "@/components/ViewAsSwitcher";

interface EmployeeShellProps {
  employee: Employee;
  children: ReactNode;
}

export function EmployeeShell({ employee, children }: EmployeeShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  useGrantStore();

  const llcName = LLC_NAMES[employee.llcId] ?? employee.llcId;
  const unreadMessages = getEmployeeUnreadMessageCount(employee.llcId, employee.id, "employer");

  useEffect(() => {
    if (!notifOpen) return;
    const onClick = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [notifOpen]);

  const openMessages = () => {
    setMessagesOpen(true);
    void markEmployeeConversationRead(employee.llcId, employee.id, "employer").catch(() => {
      // Non-fatal: unread badge will simply persist.
    });
  };

  return (
    <div className="app-shell employee-shell">
      <header className="topbar">
        <div className="brand-block">
          <Link className="wordmark" to={`/portal/${employee.id}`}>
            <img src="/aequi-logo-transparent.png" alt="Aequi" />
          </Link>
          <div className="entity-label">
            <span>{llcName}</span>
            <span>Employee portal</span>
          </div>
        </div>
        <button
          className="mobile-menu-button"
          aria-label="Open navigation menu"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`topbar-actions ${isMenuOpen ? "is-open" : ""}`}>
          <ViewAsSwitcher currentEmployeeId={employee.id} />
          <button
            className="icon-button message-button"
            type="button"
            aria-label={unreadMessages > 0 ? `${unreadMessages} unread messages` : "Messages"}
            onClick={openMessages}
          >
            <MessageSquare size={18} strokeWidth={1.7} />
            {unreadMessages > 0 && <span className="notification-dot" />}
          </button>
          <div className="notification-wrap" ref={notifRef}>
            <button
              className="icon-button notification-button"
              type="button"
              aria-label="Notifications"
              onClick={() => setNotifOpen((open) => !open)}
            >
              <Bell size={18} strokeWidth={1.7} />
            </button>
            {notifOpen && (
              <div className="notification-panel" role="dialog" aria-label="Notifications">
                <div className="notification-panel-header">
                  <span>Notifications</span>
                </div>
                <p className="notification-empty">
                  Updates about your equity will appear here.
                </p>
              </div>
            )}
          </div>
          <div className="user-block">
            <span className="avatar">{employee.name.slice(0, 1)}</span>
            <span className="user-name">{employee.name}</span>
          </div>
        </nav>
      </header>
      <main className="page-content">{children}</main>
      {messagesOpen && (
        <EmployeeMessagesPanel
          llcId={employee.llcId}
          employeeId={employee.id}
          onClose={() => setMessagesOpen(false)}
        />
      )}
    </div>
  );
}

const LLC_NAMES: Record<string, string> = {
  "llc-1": "Summit HVAC Solutions LLC",
  "llc-2": "Ironclad Construction Group LLC",
};
