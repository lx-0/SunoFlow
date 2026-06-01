---
milestone: M004
slice: S05
project: SunoFlow
created: 2026-06-01T15:02:29Z
status: planned
task_count: 4
completed_tasks: 0
---

# M004-S05 -- Slice Plan

**Goal:** The app is on real devices via TestFlight, with the background-audio exit criterion verified on hardware.

## Tasks

- [ ] T01 -- App Store Connect setup (**human-gated**): paid Apple Developer account, bundle identifier, App Store Connect app record, EAS Submit credentials. I prepare config + a checklist; the account-bound steps are the user's.
- [ ] T02 -- App metadata + privacy: app name, icon, splash, `PrivacyInfo.xcprivacy` (required-reason API manifest), Info.plist usage strings (no mic/location needed -> none, or justify), build number scheme.
- [ ] T03 -- Production EAS build + TestFlight upload: `eas build --profile production` + `eas submit` to TestFlight.
- [ ] T04 -- Closed-beta smoke pass: invite the closed circle, install via TestFlight, verify the M004 exit criteria on a real device (esp. 10+ min lock-screen audio). Document in the summary.

## Done when

All tasks `[x]` and verified. The app installs from TestFlight on a real device and passes the background-audio + browse/play/playlists exit criteria. M004 closes; run `ytstack:reassess-roadmap`.

## Notes

- Apple review for a plain audio app is routine; no CarPlay entitlement is involved at this stage (CarPlay is a separate, later milestone).
- T01 + T04 depend on the paid Apple account -- the hard external gate for shipping (distinct from CarPlay's entitlement gate).
