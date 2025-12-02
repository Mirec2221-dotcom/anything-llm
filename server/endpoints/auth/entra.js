const { EntraAuth } = require("../../utils/entra");

/**
 * Entra (Azure AD) authentication endpoints
 * @param {import("express").Application} app
 */
function entraAuthEndpoints(app) {
  if (!app) return;

  /**
   * Check if Entra authentication is enabled
   */
  app.get("/api/auth/entra/enabled", async (_, response) => {
    try {
      const enabled = EntraAuth.isEnabled();
      response.status(200).json({ enabled });
    } catch (error) {
      console.error("[Entra] Error checking if enabled:", error.message);
      response.status(200).json({ enabled: false });
    }
  });

  /**
   * Initiate Entra login - returns the authorization URL
   */
  app.get("/api/auth/entra/login", async (request, response) => {
    try {
      if (!EntraAuth.isEnabled()) {
        return response.status(400).json({
          success: false,
          error: "Entra authentication is not enabled",
        });
      }

      // Generate state and nonce for security
      const state = EntraAuth.generateState();
      const nonce = EntraAuth.generateNonce();

      // Get redirect URI from env or construct from request
      const redirectUri =
        process.env.ENTRA_REDIRECT_URI ||
        `${request.protocol}://${request.get("host")}/api/auth/entra/callback`;

      // Store state and nonce in session/cookie for verification
      // Using a simple approach with cookies for now
      response.cookie("entra_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 60 * 1000, // 10 minutes
        sameSite: "lax",
      });
      response.cookie("entra_nonce", nonce, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 60 * 1000, // 10 minutes
        sameSite: "lax",
      });
      response.cookie("entra_redirect_uri", redirectUri, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 60 * 1000, // 10 minutes
        sameSite: "lax",
      });

      const authUrl = await EntraAuth.getAuthorizationUrl(
        redirectUri,
        state,
        nonce
      );

      response.status(200).json({
        success: true,
        authUrl,
      });
    } catch (error) {
      console.error("[Entra] Login error:", error.message);
      response.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Handle Entra callback after user authentication
   */
  app.get("/api/auth/entra/callback", async (request, response) => {
    try {
      if (!EntraAuth.isEnabled()) {
        return response.redirect("/?error=entra_not_enabled");
      }

      // Get stored state and nonce from cookies
      const expectedState = request.cookies?.entra_state;
      const expectedNonce = request.cookies?.entra_nonce;
      const redirectUri = request.cookies?.entra_redirect_uri;

      if (!expectedState || !expectedNonce || !redirectUri) {
        console.error("[Entra] Missing state/nonce cookies");
        return response.redirect("/?error=invalid_session");
      }

      // Clear the cookies
      response.clearCookie("entra_state");
      response.clearCookie("entra_nonce");
      response.clearCookie("entra_redirect_uri");

      // Construct current URL for openid-client
      const currentUrl = new URL(
        `${request.protocol}://${request.get("host")}${request.originalUrl}`
      );

      // Handle the callback
      const { userInfo, claims } = await EntraAuth.handleCallback(
        currentUrl,
        redirectUri,
        expectedState,
        expectedNonce
      );

      // Find or create user
      const { user, sessionToken } = await EntraAuth.findOrCreateUser(
        userInfo,
        claims
      );

      // Redirect to frontend with token
      // The frontend will store the token and redirect to home
      const frontendUrl = process.env.FRONTEND_URL || "";
      response.redirect(
        `${frontendUrl}/auth/entra/complete?token=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(JSON.stringify(user))}`
      );
    } catch (error) {
      console.error("[Entra] Callback error:", error.message);
      const frontendUrl = process.env.FRONTEND_URL || "";
      response.redirect(
        `${frontendUrl}/auth/entra/complete?error=${encodeURIComponent(error.message)}`
      );
    }
  });
}

module.exports = { entraAuthEndpoints };
