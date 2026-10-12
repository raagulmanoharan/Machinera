# Little Zine

A private photo/video journal with editable notes and animated page turns. Data stays on the phone, with no account, feed, or app backend. Uninstalling can erase the journal; there is no app-managed backup or sync. Expo Go storage does not automatically migrate into a standalone build.

The default POC now runs free in **Expo Go**. See [EXPO_GO.md](EXPO_GO.md) for installation and phone testing. The manual camera is hidden when its native module is unavailable.

[TESTFLIGHT.md](TESTFLIGHT.md) is retained for future standalone distribution.

## Native manual camera

The camera no longer requires RAW. Choose **Add a moment → Shoot / manual camera** in a custom iOS build. It uses the physical rear wide camera at 1× and allows manual ISO/shutter. Minimum available ISO is the default, with shutter near 1/125 s. Actual exposure settings are stored with the page. The camera must support manual exposure.

AVFoundation requests a JPEG with speed prioritization, flash off, and virtual-camera fusion, red-eye reduction, and content-aware distortion correction disabled. ProRAW is not enabled. The app saves the returned JPEG without resizing, re-encoding, developing, or filtering it.

This does **not** switch off Apple's entire ISP, Smart HDR, sharpening, or denoising. Speed prioritization is not a documented global processing-off switch. JPEG capture is not unprocessed sensor data and does not guarantee the full sensor dynamic range. Low ISO and careful exposure can help; excessive underexposure loses shadow information. The live exposure meter is relative to Apple's metering target, not a RAW clipping histogram.

The supplied LAMPA reference is https://www.lampa.camera/. The cloud proxy returned 403 when fetching it. Its actual capture method is unverified, and this implementation does not claim equivalence. Access to that site is requested in the environment draft for later inspection.

## Original and Flat

**Editorial / Medium** is selected by default for new photos and imports. Original remains available for an unfiltered comparison. It saves the photo as supplied by the camera or picker, which may already have been processed by iOS.

**Flat** and **Editorial** are optional treatments. Editorial layers olive greens, gently warm neutrals, and richer reds over the flat base, inspired by the supplied reference. Light, Medium, and Full adjust the strength. **Flat** omits those selective colour changes. It creates a separate SDR JPEG with a -0.65 EV scale in linear light, slightly lifted blacks, restrained highlights, and 82% saturation. It adds no sharpening, noise reduction, or grain. The rendition is capped at 1600 pixels on its longest edge to bound memory/CPU use. Renditions are generated only when a treatment is selected; the source file stays intact. Compare Original/Flat before saving or in the journal reader. Flat cannot recover clipped highlights or undo camera processing.

Videos use the system camera and are unchanged by photo treatments. Library import remains available. Legacy RAW pages and DNG export remain supported, but new captures do not produce or require DNGs.

Native temporary JPEGs are discarded after save/cancel. Failed saves leave the draft available for retry. Backgrounding the native camera cancels it and stops the session. Removing a page removes app-owned media copies, not the original in Photos.

## Install on iPhone without opening Xcode

The native Swift module in `modules/zine-camera` requires a custom iOS build. **Expo Go cannot load manual camera controls**, even though RAW is no longer required. Expo Go can use the system photo/video camera, imports, and the journal reader.

Use Node 22.13+ (validated with Node 24). For TestFlight or cloud-built physical-device distribution you need an Expo account and paid Apple Developer membership. Removing RAW does not remove Apple's signing requirement. A free Apple ID plus a Mac with Xcode installed can use short-lived free device provisioning.

```sh
npm ci
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

The preview profile embeds JavaScript and needs no Metro server or local Mac. Register your iPhone and install via EAS's resulting installation page. Choose your own unique bundle identifier in `app.json` and replace starter icons before distribution. EAS reported Not logged in here, so no native compilation or installable build has been run. Supply an Expo token securely in environment settings or log in locally; never paste credentials into chat. Apple signing is also required.

For development, build with `--profile development`, install it, then run `npm run start:native`. For Expo Go use `npm run start:go`. Phone access to cloud Metro needs an externally reachable connection; tunnel access has not been configured or verified. Rebuild after Swift or native-dependency changes.

For TestFlight, after configuring the App Store Connect app:

```sh
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

No build or submission has been performed.

## Validation

```sh
npm run typecheck
npm test
npx expo export --platform ios
npx expo-modules-autolinking resolve --platform apple --json
```

Tests cover saved-page validation, exposure metadata, manual-JPEG and legacy RAW bridge results, tonal behavior, JPEG processing, and navigation bounds. JS export does not validate Swift compilation, signing, or camera hardware. Native-module discovery and iOS project generation passed; this Linux environment has no Apple SDK/compiler. A successful EAS build and device tests remain required.

Physical-device checks:

1. Capture on an iPhone without Bayer RAW support. Compare two shutter settings at minimum ISO and verify JPEG EXIF and journal metadata.
2. Compare the default Editorial/Medium with Original and Flat. Compare Flat, save, restart, and confirm the source stays unchanged.
3. Deny permissions, background the camera, and retry failed captures. Verify the session stops on close.
4. Import portrait/landscape HEIC, JPEG, PNG, and large photos; check orientation and memory use.
5. Test videos with sound, page flipping, note edits, draft cancellation, and page deletion.
6. Open legacy RAW pages and export existing DNGs.
7. Verify LAMPA's documented technique and compare actual scenes before claiming the same look or processing behavior.

## Files

- `App.tsx`: reader, capture flow, drafts, and treatment controls.
- `modules/zine-camera/ios/`: native camera and Expo bridge.
- `src/manualCapture.ts`: validation of JPEG capture results.
- `src/nativeCamera.ts`: native camera access and temporary-file cleanup.
- `src/model.ts`, `src/storage.ts`: journal format and on-device persistence.
- `src/processPhoto.ts`, `src/treatment.ts`, `src/jpeg.ts`: optional Flat processing.
- `eas.json`: preview, development, and production build profiles.

The previous Machinera files were cleared at your request. Git history remains, and the backup is `/workspace/Machinera-before-fresh-project.tar.gz`. The Expo Go POC is published on the codex/little-zine-expo-go-poc branch.
