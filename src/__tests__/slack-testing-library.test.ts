import { createServer, Server } from "http";
import { SlackTestingLibrary } from "../slack-testing-library";

jest.mock("http");

describe("SlackTestingLibrary", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("constructor", () => {
    it("should return an instance of SlackTestingLibrary when correctly initialized", () => {
      const slackTestingLibrary = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
        actor: {
          teamId: "T1234567",
          userId: "U1234567",
        },
        port: 3840,
      });

      expect(slackTestingLibrary instanceof SlackTestingLibrary).toBe(true);
    });
  });

  describe("#init()", () => {
    it("should create a HTTP server and start listening when called", async () => {
      const slackTestingLibrary = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
      });
      (createServer as jest.Mock<Server>).mockImplementation(() => {
        return {
          listen: (_port: number, cb: Function) => cb(),
        } as unknown as Server;
      });

      await slackTestingLibrary.init();

      expect(createServer).toHaveBeenCalled();
    });

    it("should listen on a custom port if provided", async () => {
      const slackTestingLibrary = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
        port: 4001,
      });
      const mockListen = jest.fn((_port, cb) => cb());

      (createServer as jest.Mock<Server>).mockImplementation(() => {
        return {
          listen: mockListen,
        } as unknown as Server;
      });

      await slackTestingLibrary.init();

      expect(mockListen).toHaveBeenCalledWith(4001, expect.any(Function));
    });
  });

  describe("#teardown()", () => {
    it("should stop the server if one is running", async () => {
      const slackTestingLibrary = new SlackTestingLibrary({
        baseUrl: "https://www.github.com/chrishutchinson/slack-testing-library",
      });

      const mockClose = jest.fn((cb) => cb());

      (createServer as jest.Mock<Server>).mockImplementation(() => {
        return {
          listen: (_port: number, cb: Function) => cb(),
          close: mockClose,
        } as unknown as Server;
      });

      await slackTestingLibrary.init();

      await slackTestingLibrary.teardown();

      expect(mockClose).toHaveBeenCalled();
    });
  });
});
