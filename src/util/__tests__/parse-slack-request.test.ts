import { parseSlackRequest } from "../parse-slack-request";

describe("#parseSlackRequest()", () => {
  it("should return an empty objet for an unknown request type", () => {
    expect(parseSlackRequest("/some/unknown/url", {})).toEqual({});
  });

  it("should return the parsed view for a views.publish request", () => {
    expect(
      parseSlackRequest("/slack/api/views.publish", {
        view: JSON.stringify({
          example: "view",
        }),
      })
    ).toEqual({
      view: {
        example: "view",
      },
    });
  });
});
