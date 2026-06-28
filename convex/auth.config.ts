// Lie Convex à Clerk : Convex valide les JWT signés par Clerk (template "convex").
// CLERK_JWT_ISSUER_DOMAIN est une variable d'env DU BACKEND Convex (npx convex env set ...).
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: 'convex',
    },
  ],
};
