import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { OwnerDashboard } from "@/pages/OwnerDashboard";
import { ValuationHistoryPage } from "@/pages/ValuationHistoryPage";
import { EmployeeListPage } from "@/pages/EmployeeListPage";
import { EmployeeDetailPage } from "@/pages/EmployeeDetailPage";
import { EmployeePortalPage } from "@/pages/EmployeePortalPage";
import { EmployeeValuationsPage } from "@/pages/EmployeeValuationsPage";
import { ContractsPage } from "@/pages/ContractsPage";
import { ContractViewerPage } from "@/pages/ContractViewerPage";
import { GrantPage } from "@/pages/GrantPage";
import { PoolExpansionPage } from "@/pages/PoolExpansionPage";
import "@/styles/global.css";
import "@/styles/dashboard.css";

function App() {
  return <Routes>
    <Route path="/" element={<OwnerDashboard />} />
    <Route path="/valuation-history/:llcId" element={<ValuationHistoryRoute />} />
    <Route path="/employees" element={<EmployeeListPage />} />
    <Route path="/employees/:employeeId" element={<EmployeeDetailPage />} />
    <Route path="/portal/:employeeId" element={<EmployeePortalPage />} />
    <Route path="/portal/:employeeId/valuations" element={<EmployeeValuationsPage />} />
    <Route path="/contracts" element={<ContractsPage />} />
    <Route path="/contracts/:grantId" element={<ContractViewerPage />} />
    <Route path="/grants/new" element={<GrantPage llcId="llc-1" />} />
    <Route path="/pool/expand" element={<PoolExpansionPage llcId="llc-1" />} />
    <Route path="*" element={<OwnerDashboard />} />
  </Routes>;
}

function ValuationHistoryRoute() {
  return <Routes><Route path="/valuation-history/:llcId" element={<ValuationHistoryPage llcId="llc-1" />} /></Routes>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>
);
