import { WebClient } from "@slack/web-api";

export const getSlackClient = () => {
  return new WebClient(process.env.SLACK_BOT_TOKEN, {
    slackApiUrl: "http://localhost:8123/slack/api",
  });
};
