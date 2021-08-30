export type SlackChannel = {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  created: number;
  is_archived: boolean;
  is_general: boolean;
  unlinked: number;
  name_normalized: string;
  is_shared: boolean;
  parent_conversation: null;
  creator: string;
  is_moved: 0;
  is_ext_shared: false;
  is_org_shared: false;
  shared_team_ids: string[];
  internal_team_ids: string[];
  pending_shared: unknown[];
  pending_connected_team_ids: unknown[];
  is_pending_ext_shared: boolean;
  is_member: boolean;
  is_private: boolean;
  is_mpim: boolean;
  topic: { value: string; creator: string; last_set: number };
  purpose: { value: string; creator: string; last_set: number };
  num_members: number;
};

export type SlackTeam = {
  id: string;
  name: string;
};

interface BaseSlackEvent {
  type: string;
  event_ts: number;
}
export interface SlackEvent<T extends BaseSlackEvent> {
  type: string;
  team_id: string;
  event: T;
}

export interface AppMentionEvent extends BaseSlackEvent {
  type: "app_mention";
  user: string;
  text: string;
  ts: string;
  team: string;
  channel: string;
}
