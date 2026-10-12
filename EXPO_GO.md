# Try Little Zine for free with Expo Go

No Apple Developer membership, TestFlight, Xcode, or EAS build is required.

## On a computer and iPhone

1. Install a recent Node.js LTS (22.13+; this project was tested with Node 24) on any supported Mac, Windows, or Linux computer.
2. Install Expo Go from the App Store on your iPhone. It needs to support this project's Expo SDK 57; an older Expo Go version will report a version mismatch.
3. Download the ZIP from the GitHub branch `codex/little-zine-expo-go-poc`, extract it, or clone that branch. Open a terminal in the directory containing package.json:

```sh
npm ci
npm start
```

4. Put the computer and iPhone on the same Wi-Fi. Scan Metro's QR code with the iPhone Camera app and open it in Expo Go. Leave the terminal running.
5. Choose **Add a moment → Take a photo**, record a video, or import from the photo library. Allow camera/microphone permissions as requested. Compare Original, Flat and Editorial, choose strength, add a note, and save. Swipe the journal pages and restart it to test persistence.

The custom manual ISO/shutter camera is hidden in Expo Go. System-camera photos still have Apple's processing; photo treatments are applied afterward. Videos are unchanged by the photo treatments. Everything stays in Expo Go's local app storage; it will not automatically migrate to a future standalone app and may disappear if Expo Go is uninstalled.

## If the phone cannot reach the computer

Try `npx expo start --go --tunnel` on the computer. The project now includes @expo/ngrok as a development dependency. Tunnel operation needs Internet access to Expo/ngrok and remains unverified in this managed cloud environment. Corporate VPNs/firewalls and router isolation can block a local connection. Running on your own computer with the phone on the same Wi-Fi avoids needing cloud phone connectivity.

The cloud machine's localhost/LAN address is not a usable iPhone link. Do not try to scan a cloud localhost QR code. A cloud-generated tunnel link must be validated before sharing it; no such link is available yet. A real tunnel attempt was made, and the agent reported proxy 403 responses for tunnel.us.ngrok.com. DNS fallback requests to dns.google.com and s3.amazonaws.com were also denied; allow the primary tunnel endpoint first before deciding whether these fallbacks are required. The required primary host was added to the environment configuration draft. Save/apply the network settings before retrying. A draft save does not grant runtime access, and successful connection remains unverified.

## Developer checks

```sh
npm run typecheck
npm test
npx expo export --platform ios
```

`npm start` and `npm run start:go` explicitly target Expo Go. `npm run start:native` is retained for a future custom build. Native modules and EAS profiles are preserved, but are optional for this POC.
