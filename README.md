# Slack Testing Library

> A mock server and library for testing interactive Slack apps

## Installation

```bash
# NPM
npm install --save-dev slack-testing-library
```

OR

```bash
# Yarn
yarn add --dev slack-testing-library
```

## How it works

Slack Testing Library allows you to run integration tests against your Slack app's API server, replicating the behaviour of Slack's API to give you quicker tests.

It is designed to use simple methods that describe how real users will interact with your Slack app (e.g. `openHome()` or `interactWith("button")`), helping you to test the expected behaviour of your application, not the implementation details.

## Getting started

1. Set up your API server to route Slack API requests to the Slack Testing Library intercept server

```ts
import { WebClient } from "@slack/web-api";

return new WebClient(botToken, {
  slackApiUrl: "http://localhost:8123/slack/api",
});
```

> Note: if you pass a custom `port` value to the `SlackTestingLibrary` constructor, change the port provided here in the `slackApiUrl`.

2. Import the library and initialize an instance of Slack Testing Library at the top of your tests:

   ```ts
   import { SlackTestingLibrary } from "slack-testing-library";

   const sl = new SlackTestingLibrary({
     // This is your URL + path to your API server that handles Slack events
     baseUrl: "http://localhost:3000/api/event",
   });
   ```

   > Note: you'll need to have started your application server before running your tests.

3. Configure your test suite to start and stop the Slack Testing Library server:

   ```ts
   describe("Your test suite...", () => {
     beforeAll(async () => {
       // Starts the intercept server
       await sl.init();
     });

     afterAll(async () => {
       // Stops the intercept server
       await sl.teardown();
     });

     beforeEach(() => {
       // Resets the state of the intercept server
       sl.reset();
     });

     // ...
   });
   ```

4. Test your Slack app

   ```ts
   it("should show a refresh button on the app home screen", async () => {
     await sl.openHome();
     await sl.interactWith("button", "Refresh");
   });
   ```

## API

### Setup and teardown

#### `init(): Promise<void>`

You will need to do this before all your tests start, to kick off the Slack Testing Library server. It's easiest to do this using the `beforeAll` hook.

#### `teardown(): Promise<void>`

You will need to do this after all your tests have run. It's easiest to do this using the `afterAll` hook.

### Mocking or intercepting Slack API responses

Sometimes you'll want to provide custom responses from Slack API calls. To do so, you can use the `intercept()` method, which allows you to provide a custom response from Slack.

#### `intercept(): void`

In this example, we intercept the `conversations.info` API call and retrn a custom response, forcing an error. This allows us to then test the error handling behaviour of our application.

```ts
sl.intercept("conversations.info", () => ({
  ok: false,
  error: "channel_not_found",
  channel: null,
}));
```

> Note: at the moment `.intercept()` intercepts all requests to the Slack API for that method (e.g. `conversations.info`). If you want to reset this, use `sl.reset()`. In the near future we expect to add support for single use intercepts.

### Navigation

#### `openHome(): Promise<void>`

This triggers the `app_home_opened` event, and waits for a `views.publish` request from your application server.

> Note: This method requires an actor to be passed to the `SlackTestingLibrary` initializer, or via the `actAs` method before your test is run.

```ts
const sl = new SlackTestingLibrary({
  baseUrl: "https://localhost:3000/api/event",
  actor: {
    userId: "U12345678",
    teamId: "T12345678",
  },
});
```

OR

```ts
sl.actAs({
  userId: "U12345678",
  teamId: "T12345678",
});
```

### Finding elements and interacting with them

#### `getByText(): Promise<void>`

This allows you to find a specific string or piece of text within a the current active view (e.g. after your app has called `views.publish` for the app home).

```ts
// This would look for any text block in the active view containing the words "Hello, world!". This would fail if the text could not be found
await sl.getByText("Hello, world!");
```

> Note: At the moment this is limited to "section" and "header" blocks. In future this will expand to include support for looking inside messages, ephemeral messages, and other elements (including buttons and input controls).

#### `interactWith(): Promise<void>`

This allows you to find an interactive element (e.g. buttons) and interact with it.

```ts
// This would click the button with the text "Refresh", and fail if the button could not be found
await sl.interactWith("button", "Refresh");
```
