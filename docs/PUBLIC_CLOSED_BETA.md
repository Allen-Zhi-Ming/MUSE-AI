# MUSE AI public closed-beta gate

The public product homepage remains visible at `https://museai.musedini.com/`, but unauthenticated visitors cannot open the login screen or workspace while this gate is active.

## Source of the gate

- `src/components/MarketingPage.tsx`: all three entry buttons are disabled and show authored closed-beta wording in Traditional Chinese, Simplified Chinese, English, Japanese and Korean.
- `src/components/LandingPage.tsx`: the public landing route no longer reacts to `?sso=1` or OAuth fragments and does not render `LoginScreen`.
- Existing authenticated test sessions are preserved; the gate does not delete sessions or product data.

## Reopening later

1. Restore the login callback and login-screen branch in `LandingPage.tsx` from Git history.
2. Restore the three entry-button labels and callbacks in `MarketingPage.tsx`.
3. Run `npm run verify:public-beta`, `npm run lint`, and a production build.
4. Verify the public homepage, login, OAuth callback and authenticated workspace before changing the Musedini availability state.
