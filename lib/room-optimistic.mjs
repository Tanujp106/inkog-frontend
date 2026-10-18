// Canonical records replace a matching local action in place, retaining its display order.
export function mergeRoomRecord(records, record, idField) {
  const match = records.findIndex(item => item[idField] === record[idField]
    || (record.clientActionId && item.clientActionId === record.clientActionId));
  if (match < 0) return [...records, record];
  return records.map((item, index) => {
    if (index !== match) return item;
    const keepNewerVotes = idField === 'pollId' &&
      Number(item.voteRevision ?? 0) > Number(record.voteRevision ?? 0);
    return {
      ...item, ...record,
      ...(keepNewerVotes ? { votesByMember: item.votesByMember, voteRevision: item.voteRevision } : {}),
      createdAt: item.createdAt,
    };
  });
}

export function mergeRoomHistory(records, incoming, idField) {
  return incoming.reduce((current, record) => mergeRoomRecord(current, record, idField), records);
}

export function validateRoomPoll(question, options) {
  if (typeof question !== 'string' || !question.trim()) return 'Give the poll a question first.';
  if (!Array.isArray(options) || options.length < 2 || options.length > 4 ||
      options.some(option => typeof option !== 'string' || !option.trim())) {
    return 'Polls need 2 to 4 options, and none can be blank.';
  }
  if (new Set(options.map(option => option.trim().toLowerCase())).size !== options.length) {
    return 'Make each poll option a little different.';
  }
  return null;
}
