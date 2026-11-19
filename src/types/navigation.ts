import type { NavigatorScreenParams } from '@react-navigation/native';

export interface Contact {
  id: string;
  nickname: string;
  profileEmoji: string;
  isSystemBot?: boolean;
}

export type RootStackParamList = {
  Login: undefined;
  ProfileSetup: undefined;
  MainApp: NavigatorScreenParams<RootTabParamList> | undefined;
  Chat: { contact: Contact };
  AddContact: { token?: string } | undefined;
  DeviceContacts: undefined;
  BlockedContacts: undefined;
  ConnectedAgents: undefined;
  ManageAgentPermissions: {
    connectionId: number;
    clientName: string;
    currentScopes: string[];
  };
  AuthorizeAgent: {
    client_id: string;
    redirect_uri: string;
    code_challenge: string;
    code_challenge_method: string;
    scope: string;
    state?: string;
    // Presente quando o link veio de um QR escaneado em outro device — nesse
    // caso é o navegador de origem quem navega pro redirect_url, não o app.
    pairing_token?: string;
  };
  TermsOfUse: undefined;
  PrivacyPolicy: undefined;
  Settings: { refresh?: number };
  ContactRequests: undefined;
  CreateGroup: undefined;
  GroupChat: { groupId: number; groupName: string; groupEmoji: string };
  GroupDetails: { groupId: number };
  AddGroupMembers: { groupId: number; currentMemberIds: number[] };
  Onboarding: undefined;
  DiscoverContacts: undefined;
  Debug: undefined;
  GamePlay: { lang?: string };
  GameResult: {
    score: number;
    correct: number;
    total: number;
    streakMax: number;
  };
  GameRanking: undefined;
  // Rotas de preview só em __DEV__ (tela de Debug) — montam o mesmo
  // componente das telas condicionais abaixo, sem depender do estado
  // real (sessão/perfil/descoberta/onboarding) que normalmente as gate.
  DebugLoginPreview: undefined;
  DebugProfileSetupPreview: undefined;
  DebugDiscoverContactsPreview: undefined;
  DebugOnboardingPreview: undefined;
};

export type RootTabParamList = {
  Friends: undefined;
  Profile: undefined;
  Settings: undefined;
  Game: undefined;
};
