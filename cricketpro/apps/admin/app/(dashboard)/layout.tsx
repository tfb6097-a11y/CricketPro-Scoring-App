import { AuthGuard } from "../../components/AuthGuard";
import { AdminSidebar } from "../../components/layout/AdminSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="ADMIN">
      <style>{`
        .cp-main-content {
          padding: 24px;
        }
        @media (max-width: 768px) {
          .cp-main-content {
            padding: 64px 14px 20px;
          }
        }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--cp-bg)" }}>
        <AdminSidebar />
        <div className="cp-main-content" style={{ flex: 1, overflowX: "hidden", minWidth: 0 }}>
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}