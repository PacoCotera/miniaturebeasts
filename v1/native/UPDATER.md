# CI release delivery

Release delivery keeps tested executable bytes separate from player state.
GitHub Actions builds/tests native targets and publishes the tested Linux Lab
bundle with exact source revision, successful main workflow and asset digests.
`release_delivery.py` verifies provenance; `package_staging.py` checks bounded
contents; `updater.py` supplies HTTPS/provenance helpers. [Native packaging commands](README.md#staging-bundle)
describe reproducible creation and verification.

Activation downloads a verified release before switching the existing presenter
service, then checks health and reported revision. Startup failure restores the
previous release. Runtime saves remain outside bundles. A restart causes a brief
interruption; save-format compatibility is a separate concern, and a new world
is created only for an explicitly requested fresh demo.

The public release contract contains no host identities, routing, credentials or
installation scripts. Adjacent `release.json` retains committed source metadata
and records an actual activation timestamp only at activation. Hosting metadata
is separate from the native game revision. This boundary does not provide a
custom activation manager, maintenance gateway or webhook queue.
