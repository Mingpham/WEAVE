import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Brand, Button, Card, Copy, Heading, PageTitle } from '@/components/ui';
import { en , onboardingEn } from '@/strings/en';

import { styles as s } from '@/theme';
import { Confirm } from '../onboarding/shared';

export function Welcome({ onJoin, onOrganize, onPreview }: {onJoin: () => void; onOrganize: () => void; onPreview?: () => void}) {
  return <><Brand /><View style={s.hero}><Text style={[s.eyebrow, s.accentText]}>{en.welcomeEyebrow}</Text>
    <View pointerEvents="none" style={s.ornament} /><Text accessibilityRole="header" style={s.display}>{en.welcome}</Text>
    <Text style={[s.body, s.onHero]}>{en.welcomeCopy}</Text><Text style={[s.small, s.accentText]}>{en.welcomeFooter}</Text>
  </View><PageTitle title={en.tagline} /><Button label={en.join} onPress={onJoin} variant="accent" />
    <Button label={en.organize} onPress={onOrganize} variant="secondary" />{onPreview && <Button label={en.preview} onPress={onPreview} variant="secondary" />}</>;
}
export type EventTile = { key: string; title: string; role?: 'organizer' | 'participant'; roleLabel: string; statusLabel: string; timeLabel: string; onOpen: () => void };
export function MyEvents({ events, onJoin, onCreate, onSignOut, isGuest = false }: {
  events: EventTile[]; onJoin: () => void; onCreate: () => void; onSignOut: () => void; isGuest?: boolean;
}) {
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  // Prefer the presentation role key. Labels keep older callers compatible until their adapters are updated.
  const roleOf = (event: EventTile) => event.role ?? (event.roleLabel === en.organizer ? 'organizer' : event.roleLabel === en.participant ? 'participant' : 'other');
  const groups = [{ key: 'organizer', label: en.organizer }, { key: 'participant', label: en.participant }, { key: 'other', label: onboardingEn.otherEvents }];
  return <><Brand /><PageTitle title={en.events} subtitle={en.eventsCopy} />{groups.map(group => {
    const entries = events.filter(event => roleOf(event) === group.key);
    return entries.length ? <View key={group.key} style={s.stack}><Heading>{group.label}</Heading>{entries.map(event => <Card key={event.key}>
      <View style={s.between}><Badge>{event.roleLabel}</Badge><Copy small>{event.statusLabel}</Copy></View>
      <PageTitle title={event.title} subtitle={event.timeLabel} /><Button label={en.open} onPress={event.onOpen} />
    </Card>)}</View> : null;
  })}{events.length === 0 && <Card><Copy>{en.emptyCopy}</Copy></Card>}
    <Button label={en.joinAnother} onPress={onJoin} variant="secondary" /><Button label={en.createEvent} onPress={onCreate} variant="secondary" />
    {confirmingSignOut ? <Confirm title={en.signOut} detail={onboardingEn.guestSignOut} onCancel={() => setConfirmingSignOut(false)}
      onConfirm={() => { setConfirmingSignOut(false); onSignOut(); }} /> :
      <Button label={en.signOut} onPress={() => { if (isGuest) setConfirmingSignOut(true); else onSignOut(); }} variant="secondary" />}</>;
}
