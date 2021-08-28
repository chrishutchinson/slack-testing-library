import { View } from "@slack/types";

export const parseSlackRequest = (
  url: string,
  data: Record<string, string | string[] | null>
) => {
  switch (url) {
    case "/slack/api/views.publish":
      return {
        view: data.view
          ? (JSON.parse(
              Array.isArray(data.view) ? data.view[0] : data.view
            ) as View)
          : null,
      };
    default:
      return {};
  }
};
