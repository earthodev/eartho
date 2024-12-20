// lib/oidcProvider.ts

import { Provider, KoaContextWithOIDC, Account } from 'oidc-provider';
import GoogleCloudAdapter from './google-cloud-adapter';
import subscribe from './events-listeners.js';
import findAccount from './findAccount';

/**
 * Configures and creates an OIDC provider instance with custom options.
 * This provider handles user authentication, token management, and more.
 */
export function createOidcProvider() {
  const oidc = new Provider('https://account.eartho.io', {
    // Adapter for data persistence in Google Cloud
    adapter: GoogleCloudAdapter,

    // No pre-configured clients, clients should be registered as needed
    clients: [],

    // Allow CORS requests from any origin
    clientBasedCORS: () => true,

    // Enable and configure OIDC features
    features: {
      devInteractions: { enabled: false },

      deviceFlow: { enabled: true },
      revocation: { enabled: true },
      introspection: { enabled: true },
      webMessageResponseMode: { enabled: true },
      claimsParameter: { enabled: true },
    },

    // Enables rotating refresh tokens
    rotateRefreshToken: true,

    //Returns token with user object
    conformIdTokenClaims: false,

    // Define routes for various OIDC endpoints
    routes: {
      authorization: '/api/oidc/auth',
      token: '/api/oidc/token',
      introspection: '/api/oidc/token/introspection',
      revocation: '/api/oidc/token/revoke',
      backchannel_authentication: '/api/oidc/backchannel',
      userinfo: '/api/oidc/userinfo',
      jwks: '/api/oidc/certs',
      end_session: '/api/oidc/session/end',
      device_authorization: '/api/oidc/device/code',
    },

    // Default settings for client configurations
    clientDefaults: {
      grant_types: [
        'authorization_code',
        'refresh_token',
        'client_credentials',
        'urn:ietf:params:oauth:grant-type:device_code',
        'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'implicit',
      ],
      response_types: ['code', 'id_token'],
    },

    // Defines the available claims and their scopes
    claims: {
      profile: [
        'sub',            // Subject Identifier (User ID)
        'name',           // Full name
        'given_name',     // First name
        'family_name',    // Last name
        'preferred_username', // Username or display name
        'picture',        // Profile picture URL
        'birthdate',      // Date of birth
        'locale',         // User's locale
        'updated_at'      // Profile last updated timestamp
      ],
      email: [
        'email',          // Email address
        'email_verified'  // Email verification status
      ],
      phone: [
        'phone_number',   // Phone number
        'phone_number_verified' // Phone number verification status
      ],
      address: [
        'address'         // Physical address
      ]
    },
    // Define extra parameters for handling scope dynamically
    extraParams: {
      access_id(ctx, value) {
        if (ctx.oidc.params)
          ctx.oidc.params.access_id ||= value || ''; // Ensures access_id is set or defaults to an empty string
      },
      scope(ctx, value, client) {
        if (ctx.oidc.params)
          ctx.oidc.params.scope ||= value || client.scope || 'openid profile email'; // Default scope if not provided
      },
    },
    // Interaction URLs, with client_id and interaction UID as parameters
    interactions: {
      url: (ctx: KoaContextWithOIDC, interaction): string => {
        const params = new URLSearchParams();
        const clientId = ctx.oidc.params?.client_id;
        const accessId = ctx.oidc.params?.access_id;
        if (clientId) params.set('client_id', clientId.toString());
        if (accessId) params.set('access_id', accessId.toString());
        params.set('interaction', interaction.uid);
        return `/connect?${params.toString()}`;
      },
    },

    // Reference to the account retrieval logic
    findAccount,

    // JSON Web Key Set (JWKS) for token signing, loaded from environment variables
    jwks: {
      keys: [
        {
          kty: 'RSA',
          kid: process.env.JWKS_KID!,
          alg: 'RS256',
          use: 'sig',
          e: 'AQAB',
          n: process.env.JWKS_PUBLIC_KEY!,
          d: process.env.JWKS_PRIVATE_KEY_D!,
          p: process.env.JWKS_PRIVATE_KEY_P!,
          q: process.env.JWKS_PRIVATE_KEY_Q!,
          dp: process.env.JWKS_PRIVATE_KEY_DP!,
          dq: process.env.JWKS_PRIVATE_KEY_DQ!,
          qi: process.env.JWKS_PRIVATE_KEY_QI!,
        },
      ],
    },
  });

  // Uncomment the following line to attach event listeners, if needed
  // subscribe(oidc);

  // Override the invalidate method to skip validation in specific cases
  const { invalidate: originalInvalidate } = (oidc.Client as any).Schema.prototype;
  (oidc.Client as any).Schema.prototype.invalidate = function (message: any, code: string) {
    if (code !== 'implicit-force-https' && code !== 'implicit-forbid-localhost') {
      originalInvalidate.call(this, message);
    }
  };

  return oidc;
}
