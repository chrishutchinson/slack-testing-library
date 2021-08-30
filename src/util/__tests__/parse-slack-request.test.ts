import { parseSlackRequest } from "../parse-slack-request";

describe("#parseSlackRequest()", () => {
  it("should return an unknown type for an unknown request type", () => {
    expect(parseSlackRequest("/some/unknown/url", {})).toEqual({
      type: "unknown",
    });
  });

  it("should return the parsed view for a views.publish request", () => {
    expect(
      parseSlackRequest("/slack/api/views.publish", {
        view: JSON.stringify({
          example: "view",
        }),
      })
    ).toEqual({
      type: "view",
      view: {
        example: "view",
      },
    });
  });

  it("should return the channel, parsed blocks and text for a chat.postMessage request", () => {
    expect(
      parseSlackRequest("/slack/api/chat.postMessage", {
        channel: "C12345678",
        blocks: JSON.stringify([
          {
            type: "section",
          },
        ]),
        text: "Some text",
      })
    ).toEqual({
      type: "message",
      channel: "C12345678",
      message: {
        blocks: [
          {
            type: "section",
          },
        ],
        text: "Some text",
      },
    });
  });
});
