# Project workflow

Read `CLAUDE.md` for project context and `DESIGN.md` before changing the UI.

## Automatic GitHub commits and pushes

The owner explicitly requested on November 23, 2026 that future codebase changes be committed and pushed automatically to `https://github.com/joeltracks/joeltracks-beatstore`.

- After completing each requested change, review the diff, run the relevant checks, commit the completed work with a descriptive message, and push the current branch to the configured remote without asking for this authorization again.
- Include associated assets, documentation and lockfile updates. Exclude credentials, environment secrets, browser profiles, dependencies and generated/temporary output according to `.gitignore`.
- Preserve unrelated user changes and remote history. Do not force-push or overwrite remote work; inspect and reconcile divergence before pushing.
- Verify the remote commit and report its link. If authentication or repository protections prevent a push, report the exact blocker and preserve the local work.
- This standing authorization covers Git commits and pushes. It does not authorize production deployment, paid services or live payment/email tests.
