import { Server } from "http";
import fetch from "cross-fetch";
import { Button, KnownBlock, SectionBlock, View } from "@slack/types";
import { Message } from "@slack/web-api/dist/response/ChatPostMessageResponse";
import { WebAPICallResult } from "@slack/web-api";

import { AppMentionEvent, SlackEvent } from "./types";
import { delay } from "./util/delay";
import { parseSlackRequest } from "./util/parse-slack-request";
import { SlackTestingLibraryFixtureGenerator } from "./fixture-generator";
import { startServer } from "./util/server";
import { findTextInBlock } from "./util/find-text-in-block";

interface SlackTestConstructorOptions {
  interactionUrl?: string;
  eventUrl?: string;
  port?: number;
  app?: {
    botId: string;
  };
  actor?: {
    teamId: string;
    userId: string;
  };
}

export interface SlackTestOptions {
  interactionUrl?: string;
  eventUrl?: string;
  port: number;
  app: {
    botId: string;
  };
  actor?: {
    teamId: string;
    userId: string;
  };
}

type RequestLogItem = {
  url: string;
  data: Record<string, string | string[] | null>;
};

type MessageLogItem = {
  message: Message;
  channelId: string;
};

export type InterceptedRequest = {
  url: string;
  intercept: () => Partial<WebAPICallResult>;
};

type ActiveScreen =
  | {
      type: "view";
      view: View;
    }
  | {
      type: "channel";
      channelId: string;
    };

export class SlackTestingLibrary {
  private initialOptions: SlackTestOptions;
  private options: SlackTestOptions;
  private requestLog: RequestLogItem[] = [];
  private server: Server | null = null;
  private activeScreen: ActiveScreen | null = null;

  private messageLog: MessageLogItem[] = [];
  private interceptedRequests: InterceptedRequest[] = [];

  static fixtures = SlackTestingLibraryFixtureGenerator;

  constructor(options: SlackTestConstructorOptions) {
    this.initialOptions = {
      port: 8123,
      app: {
        botId: "U0LAN0Z89",
      },
      ...options,
    };

    this.options = {
      ...this.initialOptions,
    };
  }

  async init() {
    await this.startSlackListener();
  }

  async teardown() {
    await this.stopSlackListener();
  }

  private async startSlackListener() {
    if (this.server) {
      // Prevent starting more than once
      return;
    }

    this.server = await startServer({
      port: this.options.port,
      onViewChange: (view: View) => {
        this.activeScreen = {
          type: "view",
          view,
        };
      },
      onRecieveMessage: (message: Message, channelId: string) => {
        this.messageLog.push({
          message,
          channelId,
        });
      },
      getInterceptedRequests: () => this.interceptedRequests,
      storeRequest: (request: {
        url: string;
        data: Record<string, string | string[] | null>;
      }) => {
        this.requestLog.push(request);
      },
    });
  }

  private async stopSlackListener() {
    return new Promise<void>((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close(() => resolve());
    });
  }

  private getInteractionUrl() {
    if (!this.options.interactionUrl) {
      throw new Error(
        "Please initialise SlackTestingLibrary with an interactionUrl argument"
      );
    }

    return this.options.interactionUrl;
  }

  private getEventUrl() {
    if (!this.options.eventUrl) {
      throw new Error(
        "Please initialise SlackTestingLibrary with an eventUrl argument"
      );
    }

    return this.options.eventUrl;
  }

  private async fireEvent(event: SlackEvent<any>) {
    await fetch(this.getEventUrl(), {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
  }

  private async fireInteraction(actionId: string) {
    this.checkActorStatus();

    await fetch(this.getInteractionUrl(), {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload: JSON.stringify({
          user: {
            id: this.options.actor!.userId,
            team_id: this.options.actor!.teamId,
          },
          type: "block_actions",
          actions: [
            {
              action_id: actionId,
            },
          ],
        }),
      }),
    });
  }

  private async fireShortcut(callbackId: string) {
    const timestamp = Date.now();

    await fetch(this.getInteractionUrl(), {
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `payload=${encodeURIComponent(
        JSON.stringify({
          type: "shortcut",
          action_ts: (timestamp / 1000).toFixed(6),
          team: {
            id: "T27FHQEKB",
            domain: "chris-testing",
          },
          user: {
            id: "U27DSMR43",
            username: "chris",
            team_id: "T27FHQEKB",
          },
          is_enterprise_install: false,
          enterprise: null,
          callback_id: callbackId,
          trigger_id:
            "2480645045762.75527830657.ea8211a7a61fcc21efbb3842d9b4bf8b",
        })
      )}`,
    });
  }

  private async checkRequestLog(
    matcher: Partial<{
      url: string;
      view: Partial<{
        type: "home";
      }>;
    }>,
    retriesRemaining = 3
  ): Promise<RequestLogItem[]> {
    if (retriesRemaining === 0) {
      throw new Error("Request log never populated");
    }

    if (this.requestLog.length > 0) {
      return this.requestLog.filter(({ url, data }) => {
        let matches = true;

        if (matcher.url) {
          matches = url === matcher.url;
        }

        if (matcher.view) {
          const { type, ...requestData } = parseSlackRequest(url, data);

          if (type === "view") {
            matches =
              ((requestData as any).view as View).type === matcher.view.type;
          }
        }

        return matches;
      });
    }

    await delay(
      // Delay time increases as more retries are attempted
      Math.max(Math.min(2000 * Math.pow(0.5, retriesRemaining), 1000), 250)
    );

    return this.checkRequestLog(matcher, retriesRemaining - 1);
  }

  private async checkMessageLog(
    matcher: Partial<{
      channel: string;
      text: string;
    }>,
    retriesRemaining = 3
  ): Promise<MessageLogItem[]> {
    if (retriesRemaining === 0) {
      throw new Error("Message log never populated");
    }

    if (this.messageLog.length > 0) {
      return this.messageLog.filter(({ channelId, message }) => {
        if (channelId !== matcher.channel) {
          return false;
        }

        let matches = false;

        if (matcher.text) {
          if (message.blocks) {
            const matchingElement = message.blocks.find((b) => {
              return b.text?.text?.includes(matcher.text as string);
            });

            if (matchingElement) {
              matches = true;
            }
          }

          if (message.text) {
            matches = matches || message.text.includes(matcher.text as string);
          }
        }

        return matches;
      });
    }

    await delay(
      // Delay time increases as more retries are attempted
      Math.max(Math.min(2000 * Math.pow(0.5, retriesRemaining), 1000), 250)
    );

    return this.checkMessageLog(matcher, retriesRemaining - 1);
  }

  private checkServerStatus() {
    if (!this.server) {
      throw new Error(
        "Start the Slack listening server first by awaiting `sl.init()`"
      );
    }
  }

  private checkActorStatus() {
    if (!this.options.actor) {
      throw new Error(
        "Please provide an actor team ID and user ID when you initialise SlackTester"
      );
    }
  }

  /**
   * Opens the "App Home" view
   */
  async openHome() {
    this.checkServerStatus();
    this.checkActorStatus();

    await this.fireEvent({
      type: "event",
      team_id: this.options.actor!.teamId,
      event: {
        type: "app_home_opened",
      },
      user: this.options.actor!.userId,
    } as SlackEvent<any>);
  }

  openChannel(channelId: string) {
    this.checkServerStatus();

    this.activeScreen = {
      type: "channel",
      channelId,
    };
  }

  async mentionApp({ channelId }: { channelId: string }) {
    this.checkServerStatus();
    this.checkActorStatus();

    const timestamp = Date.now();

    await this.fireEvent({
      type: "event",
      team_id: this.options.actor!.teamId,
      event: {
        type: "app_mention",
        user: this.options.actor!.userId,
        team: this.options.actor!.teamId,
        text: `<@${this.options.app.botId}>`,
        ts: (timestamp / 1000).toFixed(6),
        channel: channelId,
        event_ts: timestamp * 1000,
      },
    } as SlackEvent<AppMentionEvent>);
  }

  async runShortcut(callbackId: string) {
    await this.fireShortcut(callbackId);
  }

  /**
   * Looks for and interacts with (e.g. clicks) the element matching the params.
   *
   * @param elementType ["button"] - The type of element to interact with.
   * @param label [string] - The label of the element to interact with.
   */
  async interactWith(elementType: "button", label: string) {
    this.checkServerStatus();

    if (!this.activeScreen) {
      throw new Error("No active screen");
    }

    if (this.activeScreen.type === "view") {
      const matchingElement = (
        this.activeScreen.view.blocks as KnownBlock[]
      ).find((block) => {
        if (block.type !== "section") {
          return false;
        }

        if (block.accessory?.type !== "button") {
          return false;
        }

        if ((block.accessory as Button).text.text !== label) {
          return false;
        }

        return true;
      });

      if (!matchingElement) {
        throw new Error(
          `Unable to find ${elementType} with the label '${label}'.`
        );
      }

      const { action_id } = (matchingElement as SectionBlock)
        .accessory as Button;

      if (!action_id) {
        throw new Error(
          `Unable to interact with the matching ${elementType} element. It does not have an associated action ID.`
        );
      }

      await this.fireInteraction(action_id);

      return;
    }

    if (this.activeScreen.type === "channel") {
      throw new Error(
        "The active view is currently a channel. Interacting with channels is currently unsupported."
      );
    }

    return;
  }

  /**
   * Looks for a string in the currently active view
   *
   * @param text [string] the string to search for
   */
  async getByText(text: string) {
    this.checkServerStatus();

    if (!this.activeScreen) {
      throw new Error("No active screen");
    }

    if (this.activeScreen.type === "view") {
      const matchingElement = (
        this.activeScreen.view.blocks as KnownBlock[]
      ).find(findTextInBlock(text));

      if (!matchingElement) {
        throw new Error(
          `Unable to find the text "${text}" in the current view`
        );
      }
    }

    if (this.activeScreen.type === "channel") {
      const activeChannelId = this.activeScreen.channelId;

      const matchingMessages = await this.checkMessageLog({
        channel: activeChannelId,
        text,
      });

      if (matchingMessages.length === 0) {
        throw new Error(
          `Unable to find the text "${text}" in the current channel`
        );
      }
    }
  }

  /**
   * Checks whether or not the intercept server found exactly one views.publish request
   *
   * @returns boolean Whether or not a view has been published
   */
  async hasViewPublish(count = 1) {
    this.checkServerStatus();

    const requestLog = await this.checkRequestLog({
      url: "/slack/api/views.publish",
    });

    if (requestLog.length === 0 && count !== 0) {
      throw new Error("Did not find any matching view publishes");
    }

    if (requestLog.length !== count) {
      throw new Error(
        `Did not find ${count} matching view publishes (got ${requestLog.length}).`
      );
    }
  }

  /**
   * Set the actor to use for any Slack interactions that are user or workspace specific
   *
   * @param actor {Actor} The user ID and team ID for the actor
   */
  actAs(actor: SlackTestOptions["actor"]) {
    this.options.actor = actor;
  }

  /**
   * Intercept a Slack API request
   *
   * @param url {string} The URL to intercept
   * @param intercept {() => Partial<WebAPICallResult>} The function to call when the request is intercepted
   */
  intercept(url: string, intercept: () => Partial<WebAPICallResult>) {
    this.interceptedRequests.push({
      url: `/slack/api/${url}`,
      intercept,
    });
  }

  /**
   * Reset the stored intercepts, the request log and actor changes
   */
  reset() {
    this.interceptedRequests = [];

    this.requestLog = [];
    this.messageLog = [];

    this.activeScreen = null;

    this.options = {
      ...this.options,
      actor: this.initialOptions.actor,
    };
  }
}
