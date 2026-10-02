import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { OwnerDashboard } from "@/pages/OwnerDashboard";
import { ValuationHistoryPage } from "@/pages/ValuationHistoryPage";
import { EmployeeListPlaceholder } from "@/pages/EmployeeListPlaceholder";
import { EmployeeDetailPage } from "@/pages/EmployeeDetailPage";
import "@/styles/global.css";
import "@/styles/dashboard.css";

function App() {
  return <Routes>
    <Route path="/" element={<OwnerDashboard />} />
    <Route path="/valuation-history/:llcId" element={<ValuationHistoryRoute />} />
    <Route path="/employees" element={<EmployeeListPlaceholder />} />
    <Route path="/employees/:employeeId" element={<EmployeeDetailPage />} />
    <Route path="*" element={<OwnerDashboard />} />
  </Routes>;
}

function ValuationHistoryRoute() {
  return <Routes><Route path="/valuation-history/:llcId" element={<ValuationHistoryPage llcId="llc-1" />} /></Routes>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>
);
