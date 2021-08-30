# Slack Testing Library: Hello World example

> A simple Slack app that publishes "Hello, world!" to the App Home

## Structure

### `./server.ts`

This is the simple HTTP server that powers this Slack app.

### `./__tests__/app-home.test.ts`

The example test that verifies the App Home displays the correct text, once the app home is opened.

## Getting started

1. Install dependencies

   ```bash
   yarn
   ```

2. Run the HTTP server

   ```bash
   yarn start
   ```

3. Run the tests

   ```bash
   yarn test
   ```
