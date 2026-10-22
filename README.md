<div align="center">
	<img src="public/planwell-logo.svg" alt="Planwell logo" width="80">
  <h1>Planwell</h1>
	<p>Collaborative task and project tracking for engineering teams.</p>
</div>

## Overview

Planwell is a list-based work management application for coordinating projects,
tasks, updates, files, devices, and audit history in real time.

## Features

- Configurable task states, priorities, tags, and assignees
- Multi-filter and multi-column task sorting
- Project and task updates with audit history
- File, photo, device, and credential management
- Google authentication and real-time Convex data
- Technical intervention reports with editable sections, revision history, and archived Word/PDF exports

## Stack

Next.js 16, React 19, TypeScript, Convex, Convex Auth, Tailwind CSS 4, and
shadcn/ui. Planwell is designed for deployment on Vercel.

## Development

Requirements: Bun, a Convex deployment, and Google OAuth
credentials configured for Convex Auth.

```bash
bun install
bun run dev
```

Set `NEXT_PUBLIC_CONVEX_URL` in `.env.local`. Configure authentication secrets
in the Convex deployment environment.

## Commands

```bash
bun run dev           # Start Next.js and Convex
bun run dev:frontend  # Start Next.js only
bun run dev:backend   # Start Convex only
bun run lint          # Run ESLint
bun run build         # Create a production build
```

## Technical intervention reports

Open `/raport-interventie-tehnica/configurare` to set the company name, header,
contact details, report number prefix, default technician, and footer. Create and
edit reports at `/raport-interventie-tehnica`. Reports follow the eight sections
of the supplied Romanian intervention report; template metadata is recorded in
`lib/reports/template.json`.

The configuration also accepts a PNG/JPG company logo up to 2 MB. Images are
resized proportionally and stored as PNG in Convex Storage. Save the
configuration after uploading or removing a logo. Each report revision retains
its logo reference, so replacing a logo does not change existing revisions.
To update an existing report, apply the current company details in the editor
and save a new revision. Logos repeat in the header on every PDF and Word page.
Both formats use navy headings, teal accents, and shaded tables.

Each save creates a revision in Convex. Revisions retain the company details used
when saving, and generated DOCX/PDF files are archived in Convex Storage for that
revision. Save changes before exporting. Older revisions can be opened and saved
as a new revision. Concurrent edits are rejected until the latest version is
opened. Report numbering is automatic and sequential per intervention year.

The editor displays the form on the left and a sticky PDF preview on the right
on desktop, with both sections stacked on smaller screens. The preview can be
hidden to give the form the full width. It updates after a short pause in typing.
The preview displays the actual generated PDF, including pagination. Saved
revisions with an archived PDF display that archived file; unsaved changes use
the same PDF generator as the export. The document can also be opened in a new
tab if the browser does not support the embedded viewer.

Empty optional fields and sections are omitted from both document formats.
Material columns without any values are omitted; partially filled columns keep
empty cells without placeholders. Section numbering follows the included
content. Older archived layouts are retained, while new previews and downloads
use the current rendering rules.

The signing section always includes areas for both the technician and the
beneficiary. The technician name falls back to the revision's configured default;
the beneficiary name is included even when no representative has been entered.
Names and signature spaces stay together on the same page when they fit.

Finalization validates the specific missing fields in both the editor and
backend. The technician can come from the report or its saved company defaults;
the resolved name is stored with the revision. Drafts only require a title,
beneficiary, and valid intervention date. Validation messages appear next to
the affected fields rather than exposing a server stack trace.

Deploy the updated Convex schema/functions together with the frontend. PDF
generation uses the bundled Noto Sans font, whose license is in `public/fonts`.

## Security

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
Do not open public issues for security-sensitive reports.

## License

Planwell is proprietary software. All rights are reserved. See
[LICENSE](LICENSE) for terms.
