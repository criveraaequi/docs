import { Link } from "react-router-dom";

export function EmployeeListPlaceholder() {
  return <div className="page-state" style={{ padding: "48px" }}><Link className="back-link" to="/">← Back to dashboard</Link><p>Employee list screen coming next.</p></div>;
}
