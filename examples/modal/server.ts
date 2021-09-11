import "dotenv/config";
import express from "express";
import { ErrorRequestHandler } from "express-serve-static-core";
import { urlencoded } from "body-parser";

import { getSlackClient } from "./slack-client";

const app = express();

const slackWebApi = getSlackClient();

app.use(urlencoded({ extended: false }));

app.post("/api/interaction", async (req, res, next) => {
  const { payload } = req.body;

  if (!payload) {
    next(new Error("Invalid interaction request"));
    return;
  }

  const { type, callback_id, trigger_id } = JSON.parse(payload);

  if (type !== "shortcut" || callback_id !== "launch_modal") {
    next(new Error("Unknown interaction request"));
    return;
  }

  await slackWebApi.views.open({
    trigger_id,
    view: {
      type: "modal",
      title: {
        type: "plain_text",
        text: "Example modal",
      },
      blocks: [
        {
          type: "section",
          text: {
            text: "This is an example modal",
            type: "mrkdwn",
          },
        },
      ],
    },
  });

  res.end();
});

app.use(((err, _req, res, _next) => {
  res.status(500).send(`There was an error: ${err.message}`);
}) as ErrorRequestHandler);

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
