# Android push notifications — what is missing and how to finish it

Push works on iOS and has never worked on Android. This is not a bug in the app
code; the project has no Android push credentials at all.

## What was found

Querying Expo's credential store for the project
(`4c7cb57c-4d54-4ca3-bc97-346b2758f12f`, `com.dogsout.app`):

```
androidAppCredentials
  androidFcm ............................ null
  googleServiceAccountKeyForFcmV1 ....... null
iosAppCredentials
  pushKey.keyIdentifier ................. 87BW4Z78RN
```

iOS has a push key. Android has nothing, so Expo's push service cannot deliver a
single notification to an Android device.

There is a second, independent problem on the device side: `google-services.json`
is not in the repo and `app.json` does not reference it, so Firebase never
initialises in the Android build. `Notifications.getExpoPushTokenAsync()` throws,
`notificationService.register()` catches it, and the app carries on looking
perfectly healthy while storing no token at all.

Both have to be fixed. Either one alone leaves Android silent.

## Steps

These need a Google account with access to the project, so they cannot be done
from here.

1. **Firebase console** → open or create the project → *Add app* → **Android**,
   with package name exactly `com.dogsout.app`.
2. Download **`google-services.json`** and put it in the client repo root.
3. Add the reference to `app.json`, inside `expo.android`:
   ```json
   "googleServicesFile": "./google-services.json",
   ```
   Do this **only once the file exists** — `expo prebuild` fails outright if the
   path does not resolve, which would break the Android build rather than just
   its notifications.
4. Firebase → *Project settings* → **Service accounts** → *Generate new private
   key*. This downloads a JSON key.
5. Upload it to Expo:
   ```
   eas credentials
   → Android → production → Push Notifications: Manage your FCM V1 service account key
   → Set up a Google Service Account Key for Push Notifications
   ```
6. **Rebuild the `.aab`.** `google-services.json` is compiled into the binary, so
   no already-installed build can ever receive a push, including the one in the
   current rollout.

## Checking it worked

After installing the rebuilt app on an Android device, the device should store a
token. On the server, a send now logs the outcome instead of discarding it — see
`PushNotificationService.logTicketErrors`. Watch for:

- `Push to user N rejected by Expo: ... (MismatchSenderId)` — the
  `google-services.json` in the build belongs to a different Firebase project
  than the uploaded service account key.
- `Push to user N rejected by Expo: ... (InvalidCredentials)` — step 5 is missing
  or the key was revoked.
- `Push token for user N is no longer registered` — ordinary and harmless; the
  app was uninstalled or the token rotated.

Silence in these logs after a send now means the push was accepted.

## Why this went unnoticed for so long

`PushNotificationService.send` called `.toBodilessEntity()`, throwing away Expo's
reply. Expo answers `200 OK` even when it cannot deliver and puts the real
outcome in a per-message ticket in the body — so every Android push could fail,
for every user, on every send, with completely clean server logs. That is fixed;
the tickets are read and logged now.

The client's `catch {}` around registration hid the other half. It now warns in
development rather than swallowing the error silently.
