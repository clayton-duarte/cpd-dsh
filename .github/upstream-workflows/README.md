# Upstream workflow reference

These files record the upstream workflow configuration. GitHub Actions does not
run workflows from this directory. CPD's active workflows are in
[`.github/workflows`](../workflows/).

On a pull request to `main`, **CPD checks** builds and type-checks the locked
workspace and runs focused telemetry and desktop packaging regressions.
After a push to `main` passes those checks, the same workflow packages and
verifies the macOS arm64 DMG and publishes it with its SHA-256 checksum as a
commit-tagged GitHub prerelease. The DMG is unsigned and not notarized.

Manual runs of **CPD CI** only run the checks. The separate desktop preview
workflow can still be run manually to build an Actions artifact without
publishing a release.
