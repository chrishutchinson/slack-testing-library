import { View } from "@slack/types";
import { Message } from "@slack/web-api/dist/response/ChatScheduleMessageResponse";
import { Server } from "http";
import { SlackTestingLibrary } from "../slack-testing-library";
import { startServer } from "../util/server";

jest.mock("../util/server");
jest.mock("http");

export const createMockServer = ({
  listen,
  close,
}: Partial<{
  listen: (port: number, cb: Function) => void;
  close: (cb: Function) => void;
}> = {}): Server => {
  return {
    listen: listen || ((_port: number, cb: Function) => cb()),
    close: close || (() => {}),
  } as unknown as Server;
};

describe("SlackTestingLibrary", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("constructor", () => {
    it("should return an instance of SlackTestingLibrary when correctly initialized", () => {
      const sl = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
        actor: {
          teamId: "T1234567",
          userId: "U1234567",
        },
        port: 3840,
      });

      expect(sl instanceof SlackTestingLibrary).toBe(true);
    });
  });

  describe("#init()", () => {
    it("should create a HTTP server and start listening when called", async () => {
      const sl = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
      });

      (startServer as jest.Mock<Promise<Server>>).mockImplementation(async () =>
        createMockServer()
      );

      await sl.init();

      expect(startServer).toHaveBeenCalledWith(
        expect.objectContaining({ port: 8123 })
      );
    });

    it("should listen on a custom port if provided", async () => {
      const sl = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
        port: 4001,
      });

      (startServer as jest.Mock<Promise<Server>>).mockImplementation(async () =>
        createMockServer()
      );

      await sl.init();

      expect(startServer).toHaveBeenCalledWith(
        expect.objectContaining({ port: 4001 })
      );
    });
  });

  describe("#teardown()", () => {
    it("should stop the server if one is running", async () => {
      const sl = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
      });

      const mockClose = jest.fn((cb) => cb());

      (startServer as jest.Mock<Promise<Server>>).mockImplementation(async () =>
        createMockServer({
          close: mockClose,
        })
      );

      await sl.init();

      await sl.teardown();

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("#getByText()", () => {
    it("should throw an error if the server hasn't been initialised", async () => {
      const sl = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
      });

      await expect(sl.getByText("Sample")).rejects.toThrow(
        "Start the Slack listening server first by awaiting `sl.init()`"
      );
    });
  });

  it("should throw an error if an active screen hasn't been set", async () => {
    const sl = new SlackTestingLibrary({
      baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
    });

    (startServer as jest.Mock<Promise<Server>>).mockImplementation(async () =>
      createMockServer()
    );

    await sl.init();

    await expect(sl.getByText("Sample")).rejects.toThrow("No active screen");
  });

  describe("activeScreen: view", () => {
    it("should throw if the provided text isn't in the view", async () => {
      const sl = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
        actor: {
          teamId: "T1234567",
          userId: "U1234567",
        },
      });

      (startServer as jest.Mock<Promise<Server>>).mockImplementation(
        async ({ onViewChange }) => {
          // Set the active screen
          onViewChange({
            blocks: [
              {
                type: "section",
                text: {
                  text: "Match: 1234",
                  type: "plain_text",
                },
              },
            ],
          } as View);

          return createMockServer();
        }
      );

      await sl.init();

      await sl.openHome();

      await expect(sl.getByText("Match: 5678")).rejects.toThrow(
        'Unable to find the text "Match: 5678" in the current view'
      );
    });

    it("should resolve if the provided text is in the view", async () => {
      const sl = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
        actor: {
          teamId: "T1234567",
          userId: "U1234567",
        },
      });

      (startServer as jest.Mock<Promise<Server>>).mockImplementation(
        async ({ onViewChange }) => {
          // Set the active screen
          onViewChange({
            blocks: [
              {
                type: "section",
                text: {
                  text: "Match: 1234",
                  type: "plain_text",
                },
              },
            ],
          } as View);

          return createMockServer();
        }
      );

      await sl.init();

      await sl.openHome();

      await sl.getByText("Match: 1234");
    });
  });

  describe("activeScreen: channel", () => {
    it("should throw if the provided text isn't in any messages in the channel", async () => {
      const sl = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
        actor: {
          teamId: "T1234567",
          userId: "U1234567",
        },
      });

      (startServer as jest.Mock<Promise<Server>>).mockImplementation(
        async ({ onRecieveMessage }) => {
          // Add to the message log
          onRecieveMessage(
            {
              text: "Match: 1234",
            } as Message,
            "C1234567"
          );

          return createMockServer();
        }
      );

      await sl.init();

      await sl.openChannel("C1234567");

      await expect(sl.getByText("Match: 5678")).rejects.toThrow(
        'Unable to find the text "Match: 5678" in the current channel'
      );
    });

    it("should resolve if the provided text is in the view", async () => {
      const sl = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
        actor: {
          teamId: "T1234567",
          userId: "U1234567",
        },
      });

      (startServer as jest.Mock<Promise<Server>>).mockImplementation(
        async ({ onRecieveMessage }) => {
          // Add to the message log
          onRecieveMessage(
            {
              text: "Match: 1234",
            } as Message,
            "C1234567"
          );

          return createMockServer();
        }
      );

      await sl.init();

      await sl.openChannel("C1234567");

      await sl.getByText("Match: 1234");
    });
  });
});
