import React, { useEffect, useState } from "react";
import { FullScreenLoader } from "@/components/Preloader";
import paths from "@/utils/paths";
import useQuery from "@/hooks/useQuery";
import { AUTH_TIMESTAMP, AUTH_TOKEN, AUTH_USER } from "@/utils/constants";

export default function EntraComplete() {
  const query = useQuery();
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const errorParam = query.get("error");
      if (errorParam) {
        setError(errorParam);
        return;
      }

      const token = query.get("token");
      const userParam = query.get("user");

      if (!token || !userParam) {
        setError("Missing authentication data");
        return;
      }

      // Parse user data
      const user = JSON.parse(decodeURIComponent(userParam));

      // Clear any existing auth data
      window.localStorage.removeItem(AUTH_USER);
      window.localStorage.removeItem(AUTH_TOKEN);
      window.localStorage.removeItem(AUTH_TIMESTAMP);

      // Store new auth data
      window.localStorage.setItem(AUTH_USER, JSON.stringify(user));
      window.localStorage.setItem(AUTH_TOKEN, token);
      window.localStorage.setItem(AUTH_TIMESTAMP, Number(new Date()));

      // Redirect to home
      window.location.replace(paths.home());
    } catch (e) {
      console.error("Entra auth completion error:", e);
      setError(e.message || "Authentication failed");
    }
  }, []);

  if (error) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-primary flex items-center justify-center flex-col gap-4">
        <p className="text-red-400 font-mono text-lg">Authentication Failed</p>
        <p className="text-theme-text-primary font-mono text-sm">{error}</p>
        <p className="text-theme-text-secondary font-mono text-sm mt-4">
          Please contact your system administrator if this problem persists.
        </p>
        <a
          href={paths.home()}
          className="mt-4 px-4 py-2 bg-primary-button text-white rounded-md hover:bg-primary-button/80"
        >
          Return to Login
        </a>
      </div>
    );
  }

  // Loading state by default
  return <FullScreenLoader />;
}
