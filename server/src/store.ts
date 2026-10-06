import fs from 'fs';
import path from 'path';
import { Member } from './types.js';

const DATA_FILE = path.join(process.cwd(), 'data.json');

export interface StoreData {
  members: Record<string, Member>; // memberId -> Member
  invites: Record<string, string>; // inviteCode -> memberId
  domainAllowlist: string[];
}

let data: StoreData = {
  members: {},
  invites: {},
  domainAllowlist: ['example.com'] // Default
};

export function loadStore() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      data = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load store', e);
    }
  }
}

export function saveStore() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getMembers() {
  return data.members;
}

export function getMember(id: string) {
  return data.members[id];
}

export function getMemberByEmail(email: string) {
  return Object.values(data.members).find(m => m.email === email);
}

export function addMember(member: Member) {
  data.members[member.id] = member;
  saveStore();
}

export function getInvites() {
  return data.invites;
}

export function addInvite(code: string, memberId: string) {
  data.invites[code] = memberId;
  saveStore();
}

export function removeInvite(code: string) {
  delete data.invites[code];
  saveStore();
}

export function getDomainAllowlist() {
  return data.domainAllowlist;
}
