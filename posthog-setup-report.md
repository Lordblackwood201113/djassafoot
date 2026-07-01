<wizard-report>
# PostHog post-wizard report

The wizard completed a deep integration of PostHog analytics into Djassa Foot. The project already had a working split architecture (`analytics.web.ts` with `posthog-js` for web, and a stub `analytics.ts` for native — deferred to Phase 9). The wizard wired up environment variables, extended the event catalogue with four new events, and implemented tracking calls across five screens. User identification (via Clerk) and reset on logout were already in place via `AnalyticsBridge.tsx`.

| Event | Description | File |
|---|---|---|
| `onboarding_started` | Fired when an unauthenticated visitor lands on the welcome screen for the first time | `src/app/index.tsx` |
| `user_signed_up` | Fired when a new user successfully verifies their email and completes account creation | `src/app/(auth)/sign-up.tsx` |
| `user_signed_in` | Fired when an existing user successfully authenticates with email/password or social login | `src/app/(auth)/sign-in.tsx` |
| `match_viewed` | Fired when a user opens a match detail screen, capturing match status and round | `src/app/(app)/match/[id].tsx` |
| `prediction_placed` | Core conversion event fired when a user confirms a bet slip with stake and odds | `src/app/(app)/prono/slip.tsx` |
| `daily_bonus_claimed` | Fired when a user claims their daily flame bonus, capturing amount and streak multiplier | `src/app/(app)/(tabs)/profile.tsx` |
| `friend_added` | Fired when a user sends a friend request from the leaderboard search | `src/app/(app)/(tabs)/leaderboard.tsx` |
| `friend_request_accepted` | Fired when a user accepts an incoming friend request | `src/app/(app)/(tabs)/leaderboard.tsx` |
| `notification_viewed` | Fired when a user opens the notifications screen, capturing total and unread count | `src/app/(app)/notifications.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://eu.posthog.com/project/210748/dashboard/784974)
- [New Signups (wizard)](https://eu.posthog.com/project/210748/insights/d96rOXiJ)
- [Daily Active Predictors (wizard)](https://eu.posthog.com/project/210748/insights/ijd338B4)
- [Daily Bonus Claim Rate (wizard)](https://eu.posthog.com/project/210748/insights/yODFdB9p)
- [Onboarding to First Prediction Funnel (wizard)](https://eu.posthog.com/project/210748/insights/SICb7vJq)
- [Social Growth — Friend Activity (wizard)](https://eu.posthog.com/project/210748/insights/n7R1uxie)

## Verify before merging

- [ ] Run a full production build (`npx expo export --platform web`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` to `.env.example` and any CI/CD secret stores so collaborators know what to set.
- [ ] Confirm the returning-visitor path also calls `identify` — `AnalyticsBridge.tsx` already handles this on session restore, but verify it fires correctly after a page refresh in the web browser.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
