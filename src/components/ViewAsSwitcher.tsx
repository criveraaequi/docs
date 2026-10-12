// Aequi — "View as" identity switcher (pre-auth stand-in for real sign-in).
// Lets demo users jump between the owner view and any employee portal.
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployeeRecords } from "@/data/employeeStore";
import { useGrantStore } from "@/data/useGrantStore";

interface ViewAsSwitcherProps {
  currentEmployeeId?: string;
}

export function ViewAsSwitcher({ currentEmployeeId }: ViewAsSwitcherProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  useGrantStore();

  const employees = getEmployeeRecords().filter((employee) => employee.hasEquity);
  const current = currentEmployeeId
    ? employees.find((employee) => employee.id === currentEmployeeId) ?? null
    : null;

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="restart-wrap" ref={wrapRef}>
      <button
        className="header-action"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <span>View as</span>
        <span className="view-as-current">
          {current ? current.name : "LLC Owner"}
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="restart-confirm view-as-menu" role="menu" aria-label="View as">
          <p className="view-as-heading">Switch identity (demo)</p>
          <button
            className="view-as-option"
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/");
            }}
          >
            <strong>LLC Owner</strong>
            <span>Summit HVAC Solutions LLC</span>
          </button>
          {employees.map((employee) => (
            <button
              key={employee.id}
              className={`view-as-option${employee.id === currentEmployeeId ? " is-current" : ""}`}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                navigate(`/portal/${employee.id}`);
              }}
            >
              <strong>{employee.name}</strong>
              <span>{employee.roleOrPosition}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
