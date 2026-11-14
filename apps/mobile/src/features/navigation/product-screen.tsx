import { useEffect } from 'react';
import { router, Stack, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/screen';
import { Button, Copy, Notice, PageTitle } from '@/components/ui';
import { en, navigationEn } from '@/strings/en';
import { styles as s } from '@/theme';
import { SignIn } from '../onboarding/join-screens';
import { JoinEntry } from './join-entry';
import { MobileViewContent, OwnerViewContent, useMobilePresentation } from './presentation';
import { canOpenEventScreen, eventPath, type EventScreen, type MobileRoute } from './routes';

export function UnavailableScreen({notFound = false}: {notFound?: boolean}) {
  return <><PageTitle title={notFound ? en.screenNotFound : en.connectionTitle} /><Copy>{notFound ? en.screenNotFoundCopy : en.connectionBody}</Copy>
    <Button label={en.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} variant="secondary" /></>;
}
export function ProductScreen({route}: {route: MobileRoute}) {
  const presentation = useMobilePresentation();
  const binding = presentation?.read(route);
  const projectId = 'projectId' in route ? route.projectId : undefined;
  const access = binding?.access;
  const pendingRedirect = !!projectId && !!access?.pending && route.screen !== 'waiting';
  const joinRoute = ['join-code', 'join-consent', 'join-profile'].includes(route.screen);
  const needsSignIn = (!!projectId || joinRoute || route.screen === 'events' || route.screen === 'create-event') && presentation?.session === 'signed-out';
  useEffect(() => {
    if (needsSignIn) router.replace(joinRoute ? (`/auth?next=join${'code' in route && route.code ? `&invite=${encodeURIComponent(route.code)}` : ''}` as Href) : '/auth');
    else if (pendingRedirect && projectId) router.replace(eventPath(projectId, 'waiting') as Href);
  }, [pendingRedirect, projectId, needsSignIn, joinRoute, route]);
  const title = navigationEn.routes[route.screen as keyof typeof navigationEn.routes] ?? en.brand;
  const navigate = (screen: EventScreen) => projectId && router.push(eventPath(projectId, screen) as Href);
  const tabs: EventScreen[] = access?.pending ? [] : access?.role === 'organizer'
    ? ['command', 'plan', 'people', 'timeline', 'more'] : ['home', 'tasks', 'inbox', 'me'];
  const footer = projectId && access && tabs.length > 0 ? <View style={s.nav}>{tabs.map(tab => <Pressable key={tab}
    accessibilityRole="tab" accessibilityLabel={tab === 'more' ? en.more : navigationEn.routes[tab as keyof typeof navigationEn.routes]}
    accessibilityState={{selected: tab === route.screen}} style={s.navItem}
    onPress={() => router.replace(eventPath(projectId, tab) as Href)}>
    <Text style={[s.navText, tab === route.screen && s.navActive]}>{tab === 'command' ? en.commandTab : tab === 'more' ? en.more : navigationEn.routes[tab as keyof typeof navigationEn.routes]}</Text>
    {tab === route.screen && <View style={s.navDot} />}
  </Pressable>)}</View> : undefined;
  const ownerName = (['timeline', 'inbox', 'close', 'settlement'] as const).find(name => name === route.screen);
  const OwnerScreen = ownerName && presentation?.ownerScreens?.[ownerName];
  const denied = projectId && access && !canOpenEventScreen(route.screen as EventScreen, access);
  const state = needsSignIn || pendingRedirect || presentation?.session === 'loading'
    ? {phase: 'loading' as const, refresh: () => {}} : binding?.state;
  return <><Stack.Screen options={{title, headerRight: projectId && access?.role === 'organizer'
    ? () => <Button label={en.inbox} variant="secondary" onPress={() => navigate('inbox')} /> : undefined}} />
    <Screen state={state} footer={footer}>
      {access?.closed && <Notice>{en.eventClosed}</Notice>}
      {projectId && !access ? <UnavailableScreen /> : denied ? <><Notice>{en.errorCodes.FORBIDDEN}</Notice><Button label={en.backToEvents} onPress={() => router.replace('/events')} /></>
        : route.screen === 'more' && projectId && access ? <><PageTitle title={en.eventMenu} subtitle={access.title} />
          <Copy>{en.eventMenuCopy}</Copy>{(['tasks', 'resources', 'settings', 'close', 'settlement'] as const).map(screen => <Button key={screen}
            label={navigationEn.routes[screen]} onPress={() => navigate(screen)} variant="secondary" />)}<Button label={en.events} onPress={() => router.replace('/events')} variant="secondary" /></>
        : OwnerScreen && access ? <OwnerViewContent component={OwnerScreen} route={route} />
        : binding?.view?.screen === route.screen ? <MobileViewContent view={binding.view} offline={binding.state.offline} />
        : route.screen === 'auth' ? <SignIn />
        : route.screen === 'join-code' ? <JoinEntry code={'code' in route ? route.code : undefined} onContinue={() => {}} />
        : <UnavailableScreen />}
    </Screen>
  </>;
}
