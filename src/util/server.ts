import { createServer, Server } from "http";
import { View } from "@slack/types";
import queryString from "query-string";

import { parseSlackRequest } from "./parse-slack-request";
import { InterceptedRequest } from "../slack-testing-library";
import { Message } from "@slack/web-api/dist/response/ChatPostMessageResponse";

export const startServer = ({
  port,
  getInterceptedRequests,
  onViewChange,
  onRecieveMessage,
  storeRequest,
}: {
  port: number;
  getInterceptedRequests: () => InterceptedRequest[];
  onViewChange: (view: View) => void;
  onRecieveMessage: (message: Message, channelId: string) => void;
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

        const { type, ...requestData } = parseSlackRequest(req.url, data);

        switch (type) {
          case "view":
            onViewChange((requestData as any).view as View);
            break;
          case "message":
            onRecieveMessage(
              (requestData as any).message as Message,
              (requestData as any).channel as string
            );
            break;
          case "unknown":
            break;
        }
      }

      const interceptedRequest = getInterceptedRequests().find(
        (r) => r.url === req.url
      );

      if (interceptedRequest) {
        res.writeHead(200, {
          "Content-Type": "application/json",
          "X-Powered-By": "Slack Testing Framework",
        });

        const interceptedResponse = await interceptedRequest.intercept();

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
