import {useCallback, useEffect, useRef, useState, type PropsWithChildren} from 'react';
import {AppState} from 'react-native';
import {router, useGlobalSearchParams, type Href} from 'expo-router';
import type {Session} from '@supabase/supabase-js';
import {MobilePresentationProvider, type MobileBinding, type MobilePresentation} from '@/features/navigation/presentation';
import {eventDestination, eventPath, type EventAccess, type MobileRoute} from '@/features/navigation/routes';
import type {EventForm} from '@/features/onboarding/event-form';
import {en} from '@/strings/en';
import {authClient, connection, googleSignIn} from './auth-client';
import {ApiClient, ApiFailure} from './api-client';
import {CreateProjectBody, CreateProjectData, MeResponse, POL, type MeData} from './contracts';
import {localToUtc} from './event-time';
import * as Crypto from 'expo-crypto';
import {useMembershipBinding, readMembership} from './membership-binding';
import {usePlanningBinding} from './planning-binding';
import {useWorkBinding} from './work-binding';
import {sessionStorage} from './session-storage';

export function LiveMobileProvider({children}: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(!authClient);
  const [me, setMe] = useState<MeData>();
  const [query, setQuery] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorCode, setErrorCode] = useState<string>();
  const [authError, setAuthError] = useState<string | undefined>(authClient ? undefined : 'SERVICE_UNAVAILABLE');
  const epoch = useRef(0);
  const currentUser = useRef<string | undefined>(undefined);
  const createRequest = useRef<{body: string; key: string} | undefined>(undefined);
  const [api] = useState(() => new ApiClient(connection.api, connection.key, async () => {
    const result = await authClient?.auth.getSession();
    if (result?.error) throw new ApiFailure('UNAUTHENTICATED');
    return result?.data.session?.access_token ?? null;
  }));

  useEffect(() => {
    if (!authClient) return;
    let active = true;
    let authEventReceived = false;
    const client = authClient;
    const requestEpoch = epoch;
    const apply = (next: Session | null) => {
      if (!active) return;
      if (currentUser.current !== next?.user.id) {
        epoch.current++; currentUser.current = next?.user.id;
        setMe(undefined); setQuery('loading'); createRequest.current = undefined;
      }
      setSession(next); setHydrated(true); setAuthError(undefined);
    };
    const subscription = client.auth.onAuthStateChange((_event, next) => {authEventReceived = true; apply(next);});
    client.auth.getSession().then(({data, error}) => {
      if (error) {if (active) {setAuthError('UNAUTHENTICATED'); setHydrated(true);}}
      // INITIAL_SESSION is the authoritative initial hydration event.
      else if (active && !authEventReceived) apply(data.session);
    }).catch(() => {if (active) {setAuthError('NETWORK_ERROR'); setHydrated(true);}});
    if (AppState.currentState === 'active') client.auth.startAutoRefresh();
    const appState = AppState.addEventListener('change', state => state === 'active' ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh());
    return () => {active = false; subscription.data.subscription.unsubscribe(); appState.remove(); client.auth.stopAutoRefresh(); requestEpoch.current++;};
  }, []);

  const refresh = useCallback(() => {
    const revision = ++epoch.current;
    return api.request('/me', MeResponse).then(result => {
      if (revision === epoch.current && result.user.id === currentUser.current) {setMe(result); setQuery('ready'); setErrorCode(undefined);}
    }).catch(error => {
      if (revision === epoch.current) {setQuery('error'); setErrorCode(error instanceof ApiFailure ? error.code : 'INTERNAL');}
    });
  }, [api]);
  const userId = session?.user.id;
  useEffect(() => {if (hydrated && userId) void refresh();}, [hydrated, userId, refresh]);
  const params = useGlobalSearchParams<{projectId?: string; screen?: string; next?: string; invite?: string}>();
  const projectId = typeof params.projectId === 'string' ? params.projectId : undefined;
  const membership = useMembershipBinding({api, userId, me, refreshMe: refresh});
  const readWork = useWorkBinding(api, userId);
  const activeMembership = me?.memberships.find(m => m.project.id === projectId);
  const planning = usePlanningBinding(api, projectId, !!projectId && activeMembership?.role === 'OWNER' &&
    ['plan', 'plan-review', 'draft-item', 'resources'].includes(params.screen ?? ''));

  const joinDestination = `/join${params.invite && /^[A-Z2-9]{6}$/.test(params.invite) ? `?code=${params.invite}` : ''}` as Href;
  const signIn = async () => {await googleSignIn(params.next === 'join' ? 'join' : undefined, params.invite); if (currentUser.current) router.replace(params.next === 'join' ? joinDestination : '/events');};
  const guest = async () => {
    if (!authClient) throw new ApiFailure('SERVICE_UNAVAILABLE');
    const result = await authClient.auth.signInAnonymously();
    if (result.error || !result.data.session) throw new ApiFailure('AUTH_UNAVAILABLE');
    router.replace(params.next === 'join' ? joinDestination : '/events');
  };
  const signOut = () => {
    void authClient?.auth.signOut({scope: 'local'}).then(({error}) => {
      if (error) setAuthError('NETWORK_ERROR'); else router.replace('/');
    }).catch(() => setAuthError('NETWORK_ERROR'));
  };
  const create = async (form: EventForm) => {
    if (!session || session.user.is_anonymous) throw new ApiFailure('FORBIDDEN');
    const parsed = CreateProjectBody.safeParse({title: form.title, brief: form.brief, venue_name: form.venue || null,
      starts_at: localToUtc(form.start, form.timeZone), ends_at: localToUtc(form.end, form.timeZone), timezone: form.timeZone,
      expected_team_size: Number(form.teamSize), expected_attendees: form.attendees ? Number(form.attendees) : null, currency: form.currency});
    if (!parsed.success) throw new ApiFailure('VALIDATION_FAILED');
    const body = JSON.stringify(parsed.data);
    const actor = session.user.id;
    const ledgerKey = `weave.create.${actor}`;
    if (createRequest.current?.body !== body) {
      const stored = await sessionStorage.getItem(ledgerKey);
      let previous: {body?: string; key?: string} | undefined;
      try {previous = stored ? JSON.parse(stored) : undefined;} catch { /* Recover an interrupted draft ledger. */ }
      createRequest.current = {body, key: previous?.body === body && typeof previous.key === 'string' ? previous.key : Crypto.randomUUID()};
      await sessionStorage.setItem(ledgerKey, JSON.stringify(createRequest.current));
    }
    const result = await api.request('/projects', CreateProjectData, {method: 'POST', body: parsed.data, key: createRequest.current!.key});
    if (currentUser.current !== actor) throw new ApiFailure('UNAUTHENTICATED');
    // Use the acknowledged response immediately; a failed background read cannot turn a saved write into a failure.
    epoch.current++;
    setMe(previous => ({user: previous?.user ?? {id: actor, is_anonymous: false, email: session.user.email ?? null},
      memberships: [{member_id: result.me.id, role: result.me.role, status: result.me.status, nickname: result.me.nickname,
        project: {id: result.project.id, title: result.project.title, status: result.project.status, venue_name: result.project.venue_name,
          starts_at: result.project.starts_at, ends_at: result.project.ends_at, timezone: result.project.timezone}},
        ...(previous?.memberships ?? []).filter(m => m.project.id !== result.project.id)]}));
    setQuery('ready'); createRequest.current = undefined;
    await sessionStorage.removeItem(ledgerKey).catch(() => {});
    router.replace('/events');
  };
  function read(route: MobileRoute): MobileBinding | undefined {
    const ready = {phase: 'ready' as const, refresh: () => void refresh()};
    const memberBinding = readMembership(route, membership);
    if (memberBinding) return memberBinding;
    if (route.screen === 'auth') return {state: ready, view: {screen: 'auth', props: {
      onGoogle: signIn, onGuest: guest, sessionMessage: authError ? en.errorCodes[authError as keyof typeof en.errorCodes] : undefined,
      guestMembershipsNotMoved: !!session?.user.is_anonymous}}};
    if (route.screen === 'events') return {state: {phase: query, errorCode, refresh: () => void refresh()}, view: {
      screen: 'events', props: {events: (me?.memberships ?? []).map(m => {
        const access = membershipAccess(m);
        return {key: m.project.id, title: m.project.title, role: access.role,
          roleLabel: access.role === 'organizer' ? en.organizer : en.participant, statusLabel: m.project.status,
          timeLabel: new Intl.DateTimeFormat('en', {dateStyle: 'medium', timeStyle: 'short', timeZone: m.project.timezone}).format(new Date(m.project.starts_at)),
          onOpen: () => router.push(eventPath(m.project.id, eventDestination(access)) as Href)};
      }), onJoin: () => router.push('/join'), onCreate: () => router.push('/create-event'), onSignOut: signOut, isGuest: !!session?.user.is_anonymous}}};
    if (route.screen === 'create-event') return {state: ready, view: {screen: 'create-event', props: {
      maxMembers: POL.MAX_MEMBERS, canCreate: !!session && !session.user.is_anonymous, onCreate: create,
      onSignIn: () => router.push('/auth')}}};
    if ('projectId' in route) {
      const membership = me?.memberships.find(m => m.project.id === route.projectId);
      const specific = planning.read(route) ?? readWork(route);
      if (specific) return {...specific, access: specific.access ?? (membership && membershipAccess(membership))};
      return {state: {phase: query, errorCode, refresh: () => void refresh()}, access: membership && membershipAccess(membership)};
    }
  }
  const value: MobilePresentation = {session: !hydrated ? 'loading' : !authClient ? 'unavailable' : session ? 'signed-in' : 'signed-out', read};
  return <MobilePresentationProvider value={value}>{children}</MobilePresentationProvider>;
}
function membershipAccess(m: MeData['memberships'][number]): EventAccess {
  return {title: m.project.title, role: m.role === 'OWNER' ? 'organizer' : 'participant', pending: m.status === 'PENDING',
    draft: m.project.status === 'DRAFT', closed: m.project.status === 'CLOSED'};
}
