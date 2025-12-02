const prisma = require("../prisma");
const { makeJWT } = require("../http");

/**
 * Microsoft Entra ID (Azure AD) OpenID Connect authentication helper.
 * Uses the openid-client library for OIDC authentication.
 */
const EntraAuth = {
  /**
   * Check if Entra authentication is enabled
   * @returns {boolean}
   */
  isEnabled: function () {
    return (
      !!process.env.ENTRA_ENABLED &&
      process.env.ENTRA_ENABLED.toLowerCase() === "true" &&
      !!process.env.ENTRA_CLIENT_ID &&
      !!process.env.ENTRA_CLIENT_SECRET &&
      !!process.env.ENTRA_TENANT_ID
    );
  },

  /**
   * Get the OIDC configuration for Entra
   * @returns {Promise<object>} - OpenID Client configuration
   */
  getConfig: async function () {
    if (!this.isEnabled()) {
      throw new Error("Entra authentication is not enabled or configured.");
    }

    // Dynamic import for ESM module
    const { discovery } = await import("openid-client");

    const tenantId = process.env.ENTRA_TENANT_ID;
    const clientId = process.env.ENTRA_CLIENT_ID;
    const clientSecret = process.env.ENTRA_CLIENT_SECRET;

    const issuerUrl = new URL(
      `https://login.microsoftonline.com/${tenantId}/v2.0`
    );

    const config = await discovery(issuerUrl, clientId, clientSecret);
    return config;
  },

  /**
   * Generate the authorization URL for Entra login
   * @param {string} redirectUri - The callback URL
   * @param {string} state - Random state for CSRF protection
   * @param {string} nonce - Random nonce for replay protection
   * @returns {Promise<string>} - Authorization URL
   */
  getAuthorizationUrl: async function (redirectUri, state, nonce) {
    const { buildAuthorizationUrl } = await import("openid-client");
    const config = await this.getConfig();

    const parameters = {
      redirect_uri: redirectUri,
      scope: "openid profile email",
      state: state,
      nonce: nonce,
      response_type: "code",
    };

    const authUrl = buildAuthorizationUrl(config, parameters);
    return authUrl.href;
  },

  /**
   * Exchange authorization code for tokens and get user info
   * @param {string} code - Authorization code from callback
   * @param {string} redirectUri - The callback URL (must match the one used in authorization)
   * @param {string} expectedState - Expected state value
   * @param {string} expectedNonce - Expected nonce value
   * @param {URL} currentUrl - Current request URL with query params
   * @returns {Promise<object>} - User info from Entra
   */
  handleCallback: async function (
    currentUrl,
    redirectUri,
    expectedState,
    expectedNonce
  ) {
    const { authorizationCodeGrant, fetchUserInfo } = await import(
      "openid-client"
    );
    const config = await this.getConfig();

    // Exchange code for tokens
    const tokens = await authorizationCodeGrant(config, currentUrl, {
      expectedState,
      expectedNonce,
      idTokenExpected: true,
    });

    // Get user info
    const userInfo = await fetchUserInfo(
      config,
      tokens.access_token,
      tokens.claims().sub
    );

    return {
      tokens,
      userInfo,
      claims: tokens.claims(),
    };
  },

  /**
   * Find or create a user based on Entra user info
   * @param {object} userInfo - User info from Entra
   * @param {object} claims - Token claims
   * @returns {Promise<object>} - User object and session token
   */
  findOrCreateUser: async function (userInfo, claims) {
    const { User } = require("../../models/user");

    // Try to find user by email first
    const email = userInfo.email || claims.email || claims.preferred_username;
    if (!email) {
      throw new Error("No email found in Entra user info");
    }

    // Check if user exists by email
    let user = await User.get({ email: email.toLowerCase() });

    if (!user) {
      // Check if auto-provisioning is enabled
      const autoProvision =
        process.env.ENTRA_AUTO_PROVISION?.toLowerCase() === "true";

      if (!autoProvision) {
        throw new Error(
          "User not found and auto-provisioning is disabled. Contact your administrator."
        );
      }

      // Create new user
      const username =
        userInfo.preferred_username?.split("@")[0] ||
        email.split("@")[0] ||
        `entra_${claims.sub.substring(0, 8)}`;

      // Generate a random password (user won't need it for Entra login)
      const randomPassword = require("crypto").randomBytes(32).toString("hex");

      const defaultRole = process.env.ENTRA_DEFAULT_ROLE || "default";

      const { user: newUser, error } = await User.create({
        username: username.toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
        password: randomPassword,
        email: email.toLowerCase(),
        role: defaultRole,
      });

      if (error) {
        throw new Error(`Failed to create user: ${error}`);
      }

      user = newUser;
      console.log(`[Entra] Auto-provisioned new user: ${user.username}`);
    }

    // Check if user is suspended
    if (user.suspended) {
      throw new Error("User account is suspended");
    }

    // Create session token
    const sessionToken = makeJWT(
      { id: user.id, username: user.username },
      process.env.JWT_EXPIRY
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      sessionToken,
    };
  },

  /**
   * Generate random state for CSRF protection
   * @returns {string}
   */
  generateState: function () {
    return require("crypto").randomBytes(32).toString("hex");
  },

  /**
   * Generate random nonce for replay protection
   * @returns {string}
   */
  generateNonce: function () {
    return require("crypto").randomBytes(32).toString("hex");
  },
};

module.exports = { EntraAuth };
