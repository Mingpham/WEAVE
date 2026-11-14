import { describe, expect, it } from 'vitest';
import { canOpenEventScreen, eventDestination, eventPath, parseEventScreen, type EventAccess } from '../src/features/navigation/routes';

describe('FR-AUTH-05 product navigation', () => {
  it('routes pending memberships before role and draft routing', () => {
    expect(eventDestination({role: 'participant', pending: true, draft: false})).toBe('waiting');
    expect(eventDestination({role: 'organizer', pending: false, draft: true})).toBe('plan');
    expect(eventDestination({role: 'organizer', pending: false, draft: false})).toBe('command');
    expect(eventDestination({role: 'participant', pending: false, draft: false})).toBe('home');
  });
  it('does not expose owner editing or bypass pending membership', () => {
    const participant: EventAccess = {title: '', role: 'participant', pending: false, draft: false, closed: false};
    expect(canOpenEventScreen('manual', participant)).toBe(false);
    expect(canOpenEventScreen('task', participant)).toBe(true);
    expect(canOpenEventScreen('task', {...participant, pending: true})).toBe(false);
    expect(canOpenEventScreen('waiting', {...participant, pending: true})).toBe(true);
  });
  it('rejects preview/unknown destinations and keeps entity identifiers separate', () => {
    expect(parseEventScreen('preview')).toBeUndefined();
    expect(parseEventScreen('arbitrary')).toBeUndefined();
    expect(eventPath('project-key', 'evidence', 'source-key').params).toEqual({projectId: 'project-key', screen: 'evidence', item: 'source-key'});
  });
});
