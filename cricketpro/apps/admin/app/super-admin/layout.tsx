import { AuthGuard } from "../../components/AuthGuard";
import { SuperAdminSidebar } from "../../components/layout/SuperAdminSidebar";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="SUPER_ADMIN">
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--cp-bg)" }}>
        <SuperAdminSidebar />
        <div style={{ flex: 1, padding: 24, overflowX: "hidden" }}>{children}</div>
      </div>
    </AuthGuard>
  );
}