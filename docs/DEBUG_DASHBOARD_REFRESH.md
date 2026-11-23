# DEBUG REPORT — dashboard redraws

Date: November 23, 2026.

**Symptom:** The owner reported dashboard refreshing during tab/file selection and while idle, with upload controls difficult to use.

**Root cause:** The visibility handler cleared ready state on hide, then rendered a loading page on return and rendered again after checking the session. The hash listener repeated session resets after the main router had already rendered the destination. Independently, completion of public startup requests unconditionally called the router, which could replace a private editor even without a click. These are DOM replacements; the application contains no periodic `location.reload()` call.

**Fix:** Keep the editor mounted during an unchanged session check; use one in-flight check and throttle tab-return checks. Do not reset authenticator setup on app switches. Revalidate revoked sessions and continue enforcing all private API guards. Skip private-page redraws on public startup completion. Keep selected files when upload/conversion fails and refresh draft cards separately.

**Evidence:** Before the change, the visibility regression observed two editor replacements (`2 !== 0`). After the change, it observes zero. Delayed public-response and idle-loaded-workspace tests observe no automatic replacement. Concurrent checks issue one session request; a password/revoked result closes the editor. The Vercel error-log query returned no matching recent server errors.

**Regression test:** `tests/seller-library-ui.test.mjs` exercises actual shipped client functions, session return, MFA setup, concurrency/revocation, delayed startup responses, load retry, file preparation and honest progress. `tests/wav-conversion.test.mjs` independently decodes real encoded output and checks the WAV-only upload/checksum pipeline.

**Status:** Implemented. Live native-browser verification was stopped by Computer Use because it could not determine the current browser URL confidently enough to enforce its policy. Do not describe that check as a successful live-owner upload. Automated verification and production asset/deployment checks are recorded with the change.
