import { SlackChannel, SlackTeam } from "./types";

export class SlackTestingLibraryFixtureGenerator {
  static buildChannel(overrides: Partial<SlackChannel> = {}): SlackChannel {
    return {
      id: "C12345678",
      created: 1234,
      creator: "U12345678",
      internal_team_ids: [],
      is_archived: false,
      is_channel: true,
      is_ext_shared: false,
      is_general: false,
      is_group: false,
      is_im: false,
      is_member: true,
      is_moved: 0,
      is_mpim: false,
      is_org_shared: false,
      is_pending_ext_shared: false,
      is_private: false,
      is_shared: false,
      name: "channel-name",
      name_normalized: "channel-name",
      num_members: 1,
      parent_conversation: null,
      pending_connected_team_ids: [],
      pending_shared: [],
      purpose: {
        value: "",
        creator: "U12345678",
        last_set: 0,
      },
      shared_team_ids: [],
      topic: {
        value: "",
        creator: "U12345678",
        last_set: 0,
      },
      unlinked: 0,
      ...overrides,
    };
  }

  static buildTeam(overrides: Partial<SlackTeam> = {}): SlackTeam {
    return {
      id: "T12345678",
      name: "team-name",
      ...overrides,
    };
  }
}
