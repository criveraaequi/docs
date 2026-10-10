import { Bell, ChevronDown, FileText, Menu, MessageSquare, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
} from "@/data/grantStore";
import { useGrantStore } from "@/data/useGrantStore";
import type { LLC, LLCAuthorizedUser } from "@/data/types";

interface AppShellProps {
  llc: LLC;
  owner: LLCAuthorizedUser | null;
  children: ReactNode;
}

export function AppShell({ llc, owner, children }: AppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  useGrantStore();

  const notifications = getNotifications(llc.id);
  const unread = getUnreadCount(llc.id);

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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <Link className="wordmark" to="/">
            <img src="/aequi-logo-transparent.png" alt="Aequi" />
          </Link>
          <div className="entity-label">
            <span>{llc.name}</span>
            <span>Limited Liability Company</span>
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
          <Link className="header-action" to="/contracts">
            <FileText size={16} strokeWidth={1.7} />
            <span>Contracts</span>
            <ChevronDown size={14} />
          </Link>
          <button className="icon-button" type="button" aria-label="Messages">
            <MessageSquare size={18} strokeWidth={1.7} />
          </button>
          <div className="notification-wrap" ref={notifRef}>
            <button
              className="icon-button notification-button"
              type="button"
              aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
              onClick={() => setNotifOpen((open) => !open)}
            >
              <Bell size={18} strokeWidth={1.7} />
              {unread > 0 && <span className="notification-dot" />}
            </button>
            {notifOpen && (
              <div className="notification-panel" role="dialog" aria-label="Notifications">
                <div className="notification-panel-header">
                  <span>Notifications</span>
                  {unread > 0 && <span className="notification-count">{unread} new</span>}
                </div>
                {notifications.length === 0 ? (
                  <p className="notification-empty">No notifications yet.</p>
                ) : (
                  <ul className="notification-list">
                    {notifications.map((notification) => (
                      <li
                        key={notification.id}
                        className={`notification-item${notification.read ? "" : " is-unread"}`}
                      >
                        <p>{notification.message}</p>
                        <div className="notification-actions">
                          {notification.grantId && (
                            <button
                              className="contract-link"
                              type="button"
                              onClick={() => {
                                setNotifOpen(false);
                                if (!notification.read) void markNotificationRead(notification.id);
                                navigate(`/contracts/${notification.grantId}`);
                              }}
                            >
                              View signed contract
                            </button>
                          )}
                          {!notification.read && (
                            <button
                              className="notification-mark-read"
                              type="button"
                              onClick={() => void markNotificationRead(notification.id)}
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="user-block">
            <span className="avatar">{owner?.name.slice(0, 1) ?? "M"}</span>
            <span className="user-name">{owner?.name ?? "Owner"}</span>
          </div>
        </nav>
      </header>
      <main className="page-content">{children}</main>
    </div>
  );
}
