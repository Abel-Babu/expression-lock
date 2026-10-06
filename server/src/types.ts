export type Role = 'admin' | 'host_eligible' | 'member';
export type EnrollmentStatus = 'Invited' | 'Enrolled' | 'Revoked';

export interface Member {
  id: string; // Internal ID or member token
  name: string;
  email: string;
  role: Role;
  status: EnrollmentStatus;
  inviteCode?: string;
  department?: string;
  lastVerifiedTime?: number;
  // deviceKeyPublicKey?: string; // Phase 8
}

export interface MeetingParticipant {
  ws: any; // WebSocket
  memberId: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'NO_RESPONSE' | 'RETRYING' | 'IN_PROGRESS';
  attemptsUsed: number;
  currentNonce?: string;
  failureReason?: string;
}

export interface Round {
  roundId: string;
  startTime: number;
  deadline: number;
  hostId: string;
  type: 'STANDARD' | 'STRICT';
  status: 'OPEN' | 'CLOSED';
}

export interface RoundSummary {
  roundId: string;
  startTime: number;
  type: string;
  hostId: string;
  hostName: string;
  results: {
    memberId: string;
    name: string;
    status: string; // 'VERIFIED' | 'FAILED' | 'NO_RESPONSE'
    attempts: number;
    reason: string;
  }[];
  previousHash?: string;
  signature?: string;
}

export interface Meeting {
  id: string;
  code: string;
  participants: Map<string, MeetingParticipant>; // memberId -> Participant
  hostId: string | null;
  currentRound: Round | null;
  history: RoundSummary[];
}
