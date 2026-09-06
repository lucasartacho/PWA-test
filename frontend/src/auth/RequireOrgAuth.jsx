import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireOrgAuth({ children }) {
  const { session } = useAuth();

  if (session === undefined) {
    return null;
  }

  if (session === null) {
    return <Navigate to="/organizacao" replace />;
  }

  return children;
}
