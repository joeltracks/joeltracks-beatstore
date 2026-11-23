# Joel Tracks Beatstore

Frontend prototype for the Joel Tracks beat store, with R&B, Afro and Trap catalogs, browser previews, favorites, license selection, a cart, agreement review and a seller dashboard.

## Run locally

From the project directory, run:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Open [the local storefront](http://127.0.0.1:4173/). No frontend build or package installation is required.

## Current status

This is a UI prototype. Catalog tracks, synthesized previews, transactions and analytics include demo data. Browser storage holds local edits and shopping state. The seller dashboard is a preview without production authentication. Payments, contract execution, email delivery and private file delivery are not integrated yet.

## Project notes

- [Prototype guide](GUIDE.md)
- [Backend architecture and implementation plan](BACKEND_PLAN.md)
- [License research and proposed terms](LICENSING_PROPOSALS.md)
- [Design system](DESIGN.md)

Source files, local assets, branding and design review notes are included. Local browser profiles, caches, secrets and temporary output are excluded through `.gitignore`.
