import { createServer, Server } from "http";
import { View } from "@slack/types";
import queryString from "query-string";

import { parseSlackRequest } from "./parse-slack-request";
import { InterceptedRequest } from "../slack-testing-library";

export const startServer = ({
  port,
  interceptedRequests,
  setActiveView,
  storeRequest,
}: {
  port: number;
  interceptedRequests: InterceptedRequest[];
  setActiveView: (view: View) => void;
  storeRequest: (request: {
    url: string;
    data: Record<string, string | string[] | null>;
  }) => void;
}): Promise<Server> =>
  new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(500, {
          "X-Powered-By": "Slack Testing Framework",
        });

        res.end({
          ok: false,
          error: "Bad request",
        });
        return;
      }

      const buffers = [];

      for await (const chunk of req) {
        buffers.push(chunk);
      }

      const stringifiedData = Buffer.concat(buffers).toString();

      const data = queryString.parse(stringifiedData);

      if (req.url.startsWith("/slack/api")) {
        storeRequest({
          url: req.url,
          data,
        });

        const { view } = parseSlackRequest(req.url, data);

        if (view) {
          setActiveView(view);
        }
      }

      const interceptdRequest = interceptedRequests.find(
        (r) => r.url === req.url
      );

      if (interceptdRequest) {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "X-Powered-By": "Slack Testing Framework",
        });

        const interceptedResponse = await interceptdRequest.intercept();

        res.end(
          JSON.stringify({
            ok: true,
            response_metadata: {},
            ...interceptedResponse,
          })
        );
        return;
      }

      res.end(
        JSON.stringify({
          ok: true,
          response_metadata: {},
        })
      );
    });

    server.listen(port, () => resolve(server));
  });
