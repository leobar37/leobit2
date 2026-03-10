import { useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * This route is no longer used for creating drafts automatically.
 * Drafts are now created via useCreateEmptyDraft mutation when clicking "New".
 * Redirect to /pedidos to use the proper flow.
 */
export default function NewOrderIndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/pedidos", { replace: true });
  }, [navigate]);

  return null;
}
