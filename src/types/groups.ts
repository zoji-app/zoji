export interface GroupMember {
  user_id: number;
  nickname: string;
  profile_emoji: string;
  role: 'admin' | 'member';
  is_muted: boolean;
  joined_at: string;
}

export interface GroupLastMessage {
  emoji: string;
  sender_id: number;
  sender_emoji: string | null;
  sender_nickname: string;
  created_at: string;
}

export interface Group {
  id: number;
  name: string;
  emoji: string;
  creator_id: number;
  created_at: string;
  member_count: number;
  role: 'admin' | 'member';
  is_muted: boolean;
  members?: GroupMember[];
  // last message fields (flat, from index query)
  last_emoji?: string | null;
  last_sender_id?: number | null;
  last_sender_emoji?: string | null;
  last_sender_nickname?: string | null;
  last_message_at?: string | null;
}

export interface GroupMessage {
  id: number | string;
  group_id: number;
  sender_id: number;
  sender_nickname: string;
  sender_emoji: string | null;
  emoji: string;
  created_at: string;
  pending?: boolean;
}
