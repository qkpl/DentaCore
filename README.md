# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

### Google Maps & Places setup

To enable the clinic address picker and map pinning powered by Google, supply a Maps Platform API key with the **Maps SDK (iOS/Android)**, **Places API**, and **Geocoding API** enabled.

1. Create an `.env` file (or add to your existing one) in the project root and add:

   ```bash
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY
   ```

   Expo automatically exposes variables prefixed with `EXPO_PUBLIC_` to the app at runtime.

2. Update `app.json` so native Google Maps SDKs can render maps:

   ```jsonc
   {
     "expo": {
       "ios": {
         "config": {
           "googleMapsApiKey": "YOUR_ACTUAL_API_KEY",
         },
       },
       "android": {
         "config": {
           "googleMaps": { "apiKey": "YOUR_ACTUAL_API_KEY" },
         },
       },
     },
   }
   ```

3. Restart Expo (`npx expo start --clear`) after changing the key so the JavaScript bundle and native config both pick up the new value.

With the key in place, clinic users can search Google Maps for their address, pick a suggestion, and have the coordinates pinned automatically.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
