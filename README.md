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

## Configuration

Copy `.env.example` to a local `.env` and set the API URL and platform-specific Google OAuth client IDs. Google ID tokens continue to be exchanged through `/api/v1/auth/google`; backend access tokens are stored in browser local storage on web and Expo SecureStore on native platforms.

Deterministic browser E2E authentication is development-only. Start Expo with `EXPO_PUBLIC_E2E_AUTH_ENABLED=true`, then inject the backend fixture ID token before application JavaScript runs:

```ts
await context.addInitScript(
  ({ token }) => {
    Object.defineProperties(globalThis, {
      __MEALTALK_E2E_ID_TOKEN__: { value: token },
      // Optional: an authenticated endpoint mocked as 401 for session-clear verification.
      __MEALTALK_E2E_SESSION_PROBE_PATH__: { value: '/api/v1/e2e/session-probe' },
    });
  },
  { token: process.env.MEALTALK_E2E_ID_TOKEN },
);
```

The fixture token remains in the test runner's non-public environment and is never stored in an `EXPO_PUBLIC_*` variable or bundled into the app. Production builds ignore the runtime hook, and the production backend must reject the fixture.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
