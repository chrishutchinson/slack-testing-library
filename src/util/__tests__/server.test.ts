import { createServer, Server } from "http";
import { stringify } from "query-string";
import { startServer } from "../server";

jest.mock("http");

const createMockServer = ({
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

describe("startServer()", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should create a HTTP server and when called", async () => {
    (createServer as jest.Mock<Server>).mockImplementation(() =>
      createMockServer()
    );

    startServer({
      port: 3000,
      storeRequest: () => {},
      getInterceptedRequests: () => [],
      onRecieveMessage: () => {},
      onViewChange: () => {},
    });

    expect(createServer).toHaveBeenCalled();
  });

  it("should start listening when called", async () => {
    const mockListen = jest.fn((_port: number, cb: Function) => cb());

    (createServer as jest.Mock<Server>).mockImplementation(() =>
      createMockServer({
        listen: mockListen,
      })
    );

    startServer({
      port: 3000,
      storeRequest: () => {},
      getInterceptedRequests: () => [],
      onRecieveMessage: () => {},
      onViewChange: () => {},
    });

    expect(mockListen).toHaveBeenCalledWith(3000, expect.any(Function));
  });
});
