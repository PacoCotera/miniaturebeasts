# Miniature Beasts website

The website pitches a genetics-driven game through two distinctive play devices: a high-resolution Station with richer art, and a rugged Companion with HiBit art. The Caddy brings both together through charging, summaries and paper. Maps, research screens and the layered genetics framework carry the proposition alongside the mibis. [Gameplay](../specs/gameplay.md) owns the rules; [status](../STATUS.md) explains current implementation coverage.

## Voice and page structure

Lead with what the player can do and why it is appealing. Use direct, specific invitations in the voice of an indie game campaign. Development is the page's established context, stated briefly near the opening and prototype links, rather than repeated in every feature. Keep engineering terminology, balance arithmetic, acceptance protocols and coverage reports in linked development documents.

Lead with the complete physical kit, then show the contrasting screens, map exploration and research, the eleven genomic domains and a concrete inheritance example, and the Caddy's role at home. Companionship belongs within that connected journey. Keep genetics approachable without reducing it to cosmetic changes: inherited causes shape appearance and capabilities; expression, current condition and learned experience remain distinct. Identification can permit unedited creation; full player decoding is not a prerequisite. The page introduces intended features without implying that the browser prototypes implement the full framework. No availability, price or release date is announced.

## Artwork

The [device render](../design/grounded-screen-concepts/branding-derivatives/manifest.json) leads the page. The [Miniature Lives proofs](../design/miniature-lives-proof/README.md) demonstrate HiBit Companion and richer Station presentation. Published [map and research layouts](../design/connected-game-study/map-interaction/notes.md) show the mechanics as interaction studies, separately from the appearance studies. Preserve their knowledge boundaries and existing controls. None are running gameplay screenshots or physical validation. The earlier woodland marketing concept remains preserved in its original design home and is not used by this proposal.

[assets.json](assets.json) records all displayed images, dimensions, SHA-256 hashes and source provenance. Superseded distribution copies and tab code have been removed; original concept art, prompts and reference manifests remain in their design homes. New art does not select a canonical species, UI, enclosure or hardware specification.

## Serve and navigate

Serve `dist/` with a static HTTP server. The page has no dependency installation, build step or JavaScript. Anchor navigation and native FAQ disclosures work with keyboard and pointer. All artwork and styles are local, compatible with the gateway's existing content security policy.

The [platform gateway](../prototype/platform-server/README.md) serves the website at `/`, workbench at `/genome/` and simulator at `/sandbox/`. Website publication preserves those applications and their saved records. The workbench remains a separate authoring experiment and does not create game residents.

[Licensing](../LICENSING.md) and [branding](../BRANDING.md) apply to source and derived material.
