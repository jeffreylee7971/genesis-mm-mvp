// Genesis entry — redirects appropriately based on auth state.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Landing from "./Landing";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Authenticated visitors land on the dashboard; unauth visitors see the landing.
    // Onboarding gate is handled inside Dashboard via redirect when incomplete.
  }, [user, loading, navigate]);

  return <Landing />;
};

export default Index;
