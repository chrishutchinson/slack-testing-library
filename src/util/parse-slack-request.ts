import { KnownBlock, View } from "@slack/types";

const asSingular = (item: string | string[]) => {
  if (Array.isArray(item)) {
    return item[0];
  }

  return item;
};

export const parseSlackRequest = (
  url: string,
  data: Record<string, string | string[] | null>
):
  | {
      type: "view";
      view: View;
    }
  | {
      type: "message";
      channel: string;
      message: {
        blocks: KnownBlock[];
        text: string;
      };
    }
  | {
      type: "unknown";
    } => {
  switch (url) {
    case "/slack/api/views.publish":
    case "/slack/api/views.open":
      if (!data.view || data.view.length === 0) {
        throw new Error("Invalid request for `views.publish`");
      }

      return {
        type: "view",
        view: JSON.parse(asSingular(data.view)) as View,
      };
    case "/slack/api/chat.postMessage":
      if (!data.channel || data.channel.length === 0) {
        throw new Error("Invalid request for `chat.postMessage`");
      }

      return {
        type: "message",
        channel: asSingular(data.channel),
        message: {
          blocks: JSON.parse(asSingular(data.blocks || "[]")) as KnownBlock[],
          text: asSingular(data.text || ""),
        },
      };
    default:
      return {
        type: "unknown",
      };
  }
};
