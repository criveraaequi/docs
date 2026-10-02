import { Bell, ChevronDown, FileText, Menu, MessageSquare, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LLC, LLCAuthorizedUser } from "@/data/types";

interface AppShellProps {
  llc: LLC;
  owner: LLCAuthorizedUser | null;
  children: ReactNode;
}

export function AppShell({ llc, owner, children }: AppShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          <button className="header-action" type="button">
            <FileText size={16} strokeWidth={1.7} />
            <span>Contracts</span>
            <ChevronDown size={14} />
          </button>
          <button className="icon-button" type="button" aria-label="Messages">
            <MessageSquare size={18} strokeWidth={1.7} />
          </button>
          <button className="icon-button notification-button" type="button" aria-label="Notifications">
            <Bell size={18} strokeWidth={1.7} />
            <span className="notification-dot" />
          </button>
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
