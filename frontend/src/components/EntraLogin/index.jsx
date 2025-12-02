import React, { useState, useEffect } from "react";
import System from "@/models/system";

export default function EntraLoginButton() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkEntraEnabled() {
      try {
        const response = await fetch("/api/auth/entra/enabled");
        const data = await response.json();
        setEnabled(data.enabled);
      } catch (e) {
        console.error("Failed to check Entra status:", e);
        setEnabled(false);
      } finally {
        setChecking(false);
      }
    }
    checkEntraEnabled();
  }, []);

  const handleEntraLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/entra/login");
      const data = await response.json();

      if (data.success && data.authUrl) {
        // Redirect to Microsoft login
        window.location.href = data.authUrl;
      } else {
        console.error("Failed to get auth URL:", data.error);
        setLoading(false);
      }
    } catch (e) {
      console.error("Entra login error:", e);
      setLoading(false);
    }
  };

  // Don't show anything while checking or if not enabled
  if (checking || !enabled) {
    return null;
  }

  return (
    <div className="w-full flex flex-col items-center gap-4 mt-4">
      <div className="w-full flex items-center gap-2">
        <div className="flex-1 h-px bg-theme-text-secondary/20" />
        <span className="text-theme-text-secondary text-xs">or</span>
        <div className="flex-1 h-px bg-theme-text-secondary/20" />
      </div>
      <button
        onClick={handleEntraLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 font-medium rounded-md border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span>Redirecting...</span>
        ) : (
          <>
            <MicrosoftIcon />
            <span>Sign in with Microsoft</span>
          </>
        )}
      </button>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
