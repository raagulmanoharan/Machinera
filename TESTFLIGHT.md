# Little Zine proof of concept: TestFlight

## Included in the POC

Manual ISO/shutter JPEG capture, system photo/video capture and library import, notes, private on-device storage, a zine reader with page turns, and three photo choices:

- **Original**: no app filter; iOS camera processing still applies.
- **Flat**: quieter exposure, softer highlights, slightly lifted blacks, muted colour.
- **Editorial**: the flat base plus olive greens, gently warm neutrals, and richer reds, inspired by the supplied reference. Light/Medium/Full adjusts the whole look. Medium Editorial is the default for new photos.

Originals are retained alongside rendered photos. Saved presets/strength and sensor exposure metadata survive journal reloads. Styles apply only to photos. The preview is not a live colour-graded camera feed. JPEG capture does not provide unprocessed sensor data or the full sensor dynamic range. The reference is an inspiration, not a measured colour match.

## First upload

1. Have an Expo account and paid Apple Developer membership. TestFlight cannot be used with free Apple-ID signing.
2. Choose a unique bundle ID in `app.json` and create the iOS app in App Store Connect with that same ID. The current `com.littlezine.journal` is a placeholder.
3. Authenticate with `npx eas-cli@latest login`, or supply `EXPO_TOKEN` securely through environment settings. Do not paste credentials into chat. Run `npx eas-cli@latest whoami` to verify.
4. Run `npx eas-cli@latest build:configure` and follow prompts to bind your Expo project. Use remote managed signing credentials when guided by EAS.
5. Build and upload:

```sh
npx eas-cli@latest build --platform ios --profile testflight
npx eas-cli@latest submit --platform ios --profile testflight --latest
```

The testflight profile extends the Release/store production profile. Build numbers are incremented remotely. The build embeds JavaScript, so testers need neither Metro nor Expo Go. EAS can compile and sign without a local Mac/Xcode. `ITSAppUsesNonExemptEncryption=false` reflects that this app does not implement non-exempt custom encryption.

EAS Submit may ask for Apple authorization and the App Store Connect app's numeric Apple ID. You can configure that non-secret ID as `submit.testflight.ios.ascAppId` when known. Never store private API keys or passwords in these files.

6. Wait for App Store Connect processing, complete the TestFlight test information, and add yourself as an internal tester. Install Apple's TestFlight app and accept the invitation. External testers generally need beta review; do not submit for external testing until the device smoke test below passes.

## Test notes for testers

Try capturing a photo at low ISO and varying shutter duration. Compare Original, Flat, and Editorial at different strengths; add a note and save. Create several pages and swipe through them. Close/reopen to verify notes, media, and styles persist. Import a portrait photo and record a video with sound. Edit a note, cancel a draft, and delete a page. Original library photos should remain in Photos.

Check denied camera/microphone permissions, background cancellation, low-storage failures, orientation, and treatment time on an older device. Review highlight handling and colour on a real screen. Report the iPhone model, iOS version, and steps to reproduce any issue. The journal stays on this phone; uninstalling may erase it.

## Current validation and blockers

TypeScript, 14 automated tests, JavaScript iOS export, local native-module discovery, and iOS project generation pass. The tests cover parsing, metadata, preset strength, source preservation, tonal math, JPEG codec behavior, and navigation boundaries.

This Linux environment has no Apple SDK/compiler. Native Swift compilation and real camera behavior have not been verified. EAS reported Not logged in; no IPA has been built, uploaded, or accepted into TestFlight. Expo authorization, Apple signing, and your final bundle/App Store Connect identity are still required. Environment drafts declare the Expo token and network requirements, but do not supply credentials or publish changes.

The LAMPA website was blocked by the environment proxy. Its capture technique has not been verified; no equivalence is claimed. Access requests for lampa.camera/www.lampa.camera were saved for later inspection.
