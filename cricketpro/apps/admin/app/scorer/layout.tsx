import { AuthGuard } from "../../components/AuthGuard";

export default function ScorerLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRole="SCORER">{children}</AuthGuard>;
}