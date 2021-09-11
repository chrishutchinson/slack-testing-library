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

### Active screen

Slack Testing Library maintains an understanding of the currently active screen, just like a user in Slack would. By having an 'active screen', interaction and assertions can be made against that screen. Using methods like `openHome()` or `openChannel()` will change the active screen accordingly.

In-screen views, like modals, will also be treated as the "active screen".

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
     eventUrl: "http://localhost:3000/api/event",

     // This is your URL + path to your API server that handles Slack interactions
     //  (this might be the same as the event URL, depending on how your app is configured)
     interactionUrl: "http://localhost:3000/api/interaction",
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

This triggers the `app_home_opened` event, and waits for a `views.publish` request from your application server. The [active screen](#active-scren) will be set to the App Home.

> Note: This method requires an actor to be passed to the `SlackTestingLibrary` initializer, or via the `actAs` method before your test is run.

```ts
const sl = new SlackTestingLibrary({
  eventUrl: "https://localhost:3000/api/event",
  interactionUrl: "https://localhost:3000/api/interaction",
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

#### `openChannel(channelId: string): Promise<void>`

This sets the active screen to be the channel with the given ID. See more about [setting the active screen](#active-scren).

#### `mentionApp({ channelId: string }): Promise<void>`

This mentions the current app (bot ID can be configured in the `SlackTestingLibrary` initializer) in the given channel. This can be useful when combined with the `openChannel()` method, to open the channel and mention the app, and asserting on a response message.

Example usage:

```ts
sl.openChannel(channelId);

await sl.mentionApp({
  channelId,
});

await sl.getByText("Some text");
```

### Finding elements and interacting

#### `getByText(text: string): Promise<void>`

This allows you to find a specific string or piece of text within a the current active view (e.g. after your app has called `views.publish` for the app home).

```ts
// This would look for any text block in the active view containing the words "Hello, world!". This would fail if the text could not be found
await sl.getByText("Hello, world!");
```

> Note: At the moment this is limited to "section" and "header" blocks, and can only look at the App Home view, or within standard messages in channels.

#### `interactWith(elementType: "button", label: string): Promise<void>`

This allows you to find an interactive element (e.g. buttons) and interact with it.

```ts
// This would click the button with the text "Refresh", and fail if the button could not be found
await sl.interactWith("button", "Refresh");
```

#### `runShortcut(callbackId: string): Promise<void>`

This allows you to run a [Slack Shortcut](https://slack.com/intl/en-gb/help/articles/360004063011-Work-with-apps-in-Slack-using-shortcuts) that your App provides.

```ts
await sl.runShortcut("my_shortcuts_callback_id");
```

## Fixtures

Slack Testing Library ships with some helper methods for generating common fixture data, useful for mocking out Slack responses.

### `SlackTestingLibrary.fixtures.buildChannel(overrides: Partial<SlackChannel>): SlackChannel`

This builds a Slack Channel, useful for responding to `conversations.info` requests.

Example usage:

```ts
sl.intercept("conversations.info", () => ({
  channel: SlackTestingLibrary.fixtures.buildChannel({
    name: "my-custom-private-channel",
    is_private: true,
  }),
}));
```

### `SlackTestingLibrary.fixtures.buildTeam(overrides: Partial<SlackTeam>): SlackTeam`

This builds a Slack Team or Workspace, useful for responding to `team.info` requests.
