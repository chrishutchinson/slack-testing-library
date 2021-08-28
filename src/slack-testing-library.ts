import { createServer, Server } from "http";
import fetch from "cross-fetch";
import {
  Button,
  KnownBlock,
  SectionBlock,
  HeaderBlock,
  View,
} from "@slack/types";
import { WebAPICallResult } from "@slack/web-api";

import { SlackEvent } from "./types";
import { delay } from "./util/delay";
import { parseSlackRequest } from "./util/parse-slack-request";
import { SlackTestingLibraryFixtureGenerator } from "./fixture-generator";
import { startServer } from "./util/server";

interface SlackTestConstructorOptions {
  baseUrl: string;
  port?: number;
  actor?: {
    teamId: string;
    userId: string;
  };
}

export interface SlackTestOptions {
  baseUrl: string;
  port: number;
  actor?: {
    teamId: string;
    userId: string;
  };
}

type RequestLogItem = {
  url: string;
  data: Record<string, string | string[] | null>;
};

export type InterceptedRequest = {
  url: string;
  intercept: () => Partial<WebAPICallResult>;
};

export class SlackTestingLibrary {
  private initialOptions: SlackTestOptions;
  private options: SlackTestOptions;
  private requestLog: RequestLogItem[] = [];
  private server: Server | null = null;
  private activeView: View | null = null;
  private interceptedRequests: InterceptedRequest[] = [];

  static fixtures = SlackTestingLibraryFixtureGenerator;

  constructor(options: SlackTestConstructorOptions) {
    this.initialOptions = {
      port: 8123,
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
      setActiveView: (view: View) => {
        this.activeView = view;
      },
      interceptedRequests: this.interceptedRequests,
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

  private async fireEvent(event: SlackEvent) {
    await fetch(this.options.baseUrl, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
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
          const { view } = parseSlackRequest(url, data);

          if (view) {
            matches = view.type === matcher.view.type;
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

  private checkServerStatus() {
    if (!this.server) {
      throw new Error(
        "Start the Slack listening server first by awaiting `sl.init()`"
      );
    }
  }

  /**
   * Opens the "App Home" view
   */
  async openHome() {
    this.checkServerStatus();

    if (!this.options.actor) {
      throw new Error(
        "Please provide an actor team ID and user ID when you initialise SlackTester"
      );
    }

    await this.fireEvent({
      type: "event",
      team_id: this.options.actor.teamId,
      event: {
        type: "app_home_opened",
      },
      user: this.options.actor.userId,
    } as any);
  }

  /**
   * Looks for and interacts with (e.g. clicks) the element matching the params.
   *
   * @param elementType ["button"] - The type of element to interact with.
   * @param label [string] - The label of the element to interact with.
   */
  async interactWith(elementType: "button", label: string) {
    this.checkServerStatus();

    if (!this.activeView) {
      throw new Error("No active view");
    }

    const matchingElement = (this.activeView.blocks as KnownBlock[]).find(
      (block) => {
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
      }
    );

    if (!matchingElement) {
      throw new Error(`Unable to find ${elementType} with the label ${label}`);
    }
  }

  /**
   * Looks for a string in the currently active view
   *
   * @param text [string] the string to search for
   */
  async getByText(text: string) {
    this.checkServerStatus();

    if (!this.activeView) {
      throw new Error("No active view");
    }

    const matchingElement = (this.activeView.blocks as KnownBlock[]).find(
      (block) => {
        if (!["section", "header"].includes(block.type)) {
          return false;
        }

        if (!(block as SectionBlock | HeaderBlock).text?.text.includes(text)) {
          return false;
        }

        return true;
      }
    );

    if (!matchingElement) {
      throw new Error(`Unable to find the text "${text}" in the current view`);
    }
  }

  /**
   * Checks whether or not the intercept server found exactly one views.publish request
   *
   * @returns boolean Whether or not a view has been published
   */
  async hasViewPublish() {
    this.checkServerStatus();

    const requestLog = await this.checkRequestLog({
      url: "/slack/api/views.publish",
    });

    if (requestLog.length === 0) {
      throw new Error("Did not find any matching view publishes");
    }

    if (requestLog.length > 1) {
      throw new Error(
        "Found more than one matching view publishes. Use `hasManyViewPublish` or `hasViewPublish(count)`."
      );
    }

    return true;
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
    this.options = {
      ...this.options,
      actor: this.initialOptions.actor,
    };
  }
}
