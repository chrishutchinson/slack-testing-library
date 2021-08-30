import { createServer } from "http";
import { WebClient } from "@slack/web-api";

const slackWebApi = new WebClient(process.env.SLACK_BOT_TOKEN, {
  slackApiUrl: "http://localhost:8123/slack/api",
});

const server = createServer(async (_req, res) => {
  await slackWebApi.views.publish({
    view: {
      type: "home",
      blocks: [
        {
          type: "section",
          text: {
            text: "Hello, world!",
            type: "plain_text",
          },
        },
      ],
    },
    user_id: "U12345678",
  });

  res.end();
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
