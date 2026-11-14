export const eventScreens = [
  'command', 'plan', 'people', 'timeline', 'more', 'home', 'tasks', 'inbox', 'me',
  'waiting', 'settings', 'close', 'settlement', 'draft-item', 'plan-review', 'resources',
  'resource-report', 'task', 'task-editor', 'assign', 'submission-review', 'evidence',
  'incident', 'manual', 'new-incident', 'composer', 'report', 'probe', 'offer', 'ask-probe', 'direct-answer',
] as const;
export type EventScreen = typeof eventScreens[number];
export type EntryScreen = 'welcome' | 'auth' | 'events' | 'join-code' | 'join-consent' | 'join-profile' | 'create-event';
export type MobileRoute = {screen: EntryScreen; code?: string} | {screen: EventScreen; projectId: string; itemId?: string};
export type EventAccess = {title: string; role: 'organizer' | 'participant'; pending: boolean; draft: boolean; closed: boolean};
export const ownerScreens: readonly EventScreen[] = ['command', 'plan', 'people', 'more', 'settings', 'draft-item', 'plan-review', 'task-editor', 'assign', 'submission-review', 'manual', 'new-incident', 'ask-probe', 'direct-answer', 'close', 'settlement'];
export function eventDestination(access: Pick<EventAccess, 'role' | 'pending' | 'draft'>): EventScreen {
  if (access.pending) return 'waiting';
  return access.role === 'organizer' ? access.draft ? 'plan' : 'command' : 'home';
}
export function parseEventScreen(value: string | undefined): EventScreen | undefined {
  return eventScreens.find(screen => screen === value);
}
export function eventPath(projectId: string, screen: EventScreen, itemId?: string) {
  return {pathname: '/p/[projectId]/[screen]' as const, params: {projectId, screen, ...(itemId ? {item: itemId} : {})}};
}
export function canOpenEventScreen(screen: EventScreen, access: EventAccess): boolean {
  if (access.pending) return screen === 'waiting';
  return access.role === 'organizer' || !ownerScreens.includes(screen);
}
