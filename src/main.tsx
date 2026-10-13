import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { OwnerDashboard } from "@/pages/OwnerDashboard";
import { ValuationHistoryPage } from "@/pages/ValuationHistoryPage";
import { EmployeeListPage } from "@/pages/EmployeeListPage";
import { EmployeeDetailPage } from "@/pages/EmployeeDetailPage";
import { EmployeePortalPage } from "@/pages/EmployeePortalPage";
import { EmployeeValuationsPage } from "@/pages/EmployeeValuationsPage";
import { EmployeeContractViewerPage } from "@/pages/EmployeeContractViewerPage";
import { ContractsPage } from "@/pages/ContractsPage";
import { ContractViewerPage } from "@/pages/ContractViewerPage";
import { GrantPage } from "@/pages/GrantPage";
import { PoolExpansionPage } from "@/pages/PoolExpansionPage";
import "@/styles/global.css";
import "@/styles/dashboard.css";

function App() {
  return <Routes>
    <Route path="/" element={<PageTransition><OwnerDashboard /></PageTransition>} />
    <Route path="/valuation-history/:llcId" element={<ValuationHistoryRoute />} />
    <Route path="/employees" element={<PageTransition><EmployeeListPage /></PageTransition>} />
    <Route path="/employees/:employeeId" element={<PageTransition><EmployeeDetailPage /></PageTransition>} />
    <Route path="/portal/:employeeId" element={<PageTransition><EmployeePortalPage /></PageTransition>} />
    <Route path="/portal/:employeeId/valuations" element={<PageTransition><EmployeeValuationsPage /></PageTransition>} />
    <Route path="/portal/:employeeId/contracts/:grantId" element={<PageTransition><EmployeeContractViewerPage /></PageTransition>} />
    <Route path="/contracts" element={<PageTransition><ContractsPage /></PageTransition>} />
    <Route path="/contracts/:grantId" element={<PageTransition><ContractViewerPage /></PageTransition>} />
    <Route path="/grants/new" element={<PageTransition><GrantPage llcId="llc-1" /></PageTransition>} />
    <Route path="/pool/expand" element={<PageTransition><PoolExpansionPage llcId="llc-1" /></PageTransition>} />
    <Route path="*" element={<PageTransition><OwnerDashboard /></PageTransition>} />
  </Routes>;
}

function ValuationHistoryRoute() {
  return <Routes><Route path="/valuation-history/:llcId" element={<PageTransition><ValuationHistoryPage llcId="llc-1" /></PageTransition>} /></Routes>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>
);
