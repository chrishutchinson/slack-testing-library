import { SlackTestingLibrary } from "../../../src/slack-testing-library";
// import { SlackTestingLibrary } from 'slack-testing-library';

const sl = new SlackTestingLibrary({
  interactionUrl: "http://localhost:3000/api/interaction",
});

describe("Shortcut", () => {
  beforeAll(async () => {
    await sl.init();
  });

  afterAll(async () => {
    await sl.teardown();
  });

  it("should open a modal when the launch_modal shortcut is run and show an example message", async () => {
    await sl.runShortcut("launch_modal");
    await sl.getByText("This is an example modal");
  });
});
