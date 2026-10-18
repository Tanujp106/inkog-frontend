import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeRoomHistory, mergeRoomRecord, validateRoomPoll } from './room-optimistic.mjs';
import { parseRoomCommand } from './room-terminal.mjs';

test('echo before acknowledgement replaces local bubble in place and repeated echo stays single', () => {
  const local = { id: 'local-a', clientActionId: 'action-a', content: 'hello', createdAt: '2026-10-10T00:00:00Z' };
  const other = { id: 'local-b', clientActionId: 'action-b', content: 'hello', createdAt: '2026-10-10T00:00:01Z' };
  const canonical = { id: 'server-a', clientActionId: 'action-a', content: 'hello', createdAt: '2026-10-10T00:00:03Z' };
  const first = mergeRoomRecord([local, other], canonical, 'id');
  assert.deepEqual(first.map(item => item.id), ['server-a', 'local-b']);
  assert.equal(first[0].createdAt, local.createdAt);
  assert.deepEqual(mergeRoomRecord(first, canonical, 'id'), first);
});

test('late history merges canonical records without dropping unresolved local actions', () => {
  const local = { id: 'local', clientActionId: 'pending', createdAt: '2026-10-10T00:00:01Z' };
  const incoming = { id: 'server', createdAt: '2026-10-10T00:00:00Z' };
  assert.deepEqual(mergeRoomHistory([local], [incoming], 'id').map(item => item.id), ['local', 'server']);
});

test('guided and inline poll validation rejects fifth, blank, and case duplicate options', () => {
  assert.match(validateRoomPoll('Lunch?', ['yes', 'YES']), /different/);
  assert.match(validateRoomPoll('Lunch?', ['yes', 'no', 'maybe', 'later', 'never']), /2 to 4/);
  assert.match(validateRoomPoll('Lunch?', ['yes', ' ']), /2 to 4/);
  assert.equal(validateRoomPoll('Lunch?', ['yes', 'no', 'maybe', 'later']), null);
  assert.equal(parseRoomCommand('/poll Lunch? | yes | no | maybe | later | never').type, 'invalid');
  assert.equal(parseRoomCommand('/poll Lunch? | yes | YES').type, 'invalid');
  assert.equal(parseRoomCommand('/poll Lunch? | yes | no | maybe | later').type, 'poll-inline');
});


test('older history cannot roll a newer poll vote snapshot backward', () => {
  const live = { pollId: 'poll-1', votesByMember: [{ alias: 'A', optionIndex: 1 }], voteRevision: 2, createdAt: '2026-10-10T00:00:00Z' };
  const stale = { pollId: 'poll-1', votesByMember: [{ alias: 'A', optionIndex: 0 }], voteRevision: 1, createdAt: '2026-10-10T00:00:00Z' };
  assert.deepEqual(mergeRoomRecord([live], stale, 'pollId')[0].votesByMember, live.votesByMember);
});
