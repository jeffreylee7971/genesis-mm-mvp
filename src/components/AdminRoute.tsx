import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const ADMIN_EMAIL = "jeffreylee523@gmail.com";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;
  return <>{children}</>;
}
