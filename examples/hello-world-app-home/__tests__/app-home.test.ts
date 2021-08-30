import { SlackTestingLibrary } from "../../../src/slack-testing-library";
// import { SlackTestingLibrary } from 'slack-testing-library';

const sl = new SlackTestingLibrary({
  baseUrl: "http://localhost:3000",
});

describe("App home", () => {
  beforeAll(async () => {
    await sl.init();
  });

  afterAll(async () => {
    await sl.teardown();
  });

  it("should show the text 'Hello, world!' after opening", async () => {
    sl.actAs({
      teamId: "T12345678",
      userId: "U12345678",
    });

    await sl.openHome();
    await sl.getByText("Hello, world!");
  });
});
