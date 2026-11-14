import { Text, View } from 'react-native';
import { Badge, Brand, Button, Card, Copy, Heading, PageTitle } from '@/components/ui';
import { en } from '@/strings/en';
import { styles as s } from '@/theme';

export type WorkCard = { key: string; title: string; detail: string; badge: string; actionLabel: string; onOpen: () => void; criteria?: string[] };
export type QueueGroup = { title: string; items: WorkCard[] };
export type CommandView = {
  title: string; timeLabel: string; statusLabel: string;
  metrics: { label: string; value: string }[];
  progress: { label: string; value: number }[];
  groups: QueueGroup[];
};
export function WorkItem({ item }: {item: WorkCard}) {
  return <Card><View style={s.between}><Badge>{item.badge}</Badge></View><Heading>{item.title}</Heading><Copy small>{item.detail}</Copy>
    {item.criteria && <View style={s.stack}><Copy small>{en.criteria}</Copy>{item.criteria.map(c => <Copy key={c}>{`· ${c}`}</Copy>)}</View>}
    <Button label={item.actionLabel} onPress={item.onOpen} variant="secondary" /></Card>;
}
export function CommandCenter({ model, onNewIncident, onInbox }: { model: CommandView; onNewIncident: () => void; onInbox: () => void }) {
  return <><View style={s.between}><Brand /><Button label={en.inbox} onPress={onInbox} variant="secondary" /></View>
    <PageTitle eyebrow={en.organizer} title={en.command} subtitle={en.commandCopy} />
    <Card hero><View style={s.between}><Text style={[s.eyebrow, s.onHero]}>{en.liveEyebrow}</Text><Badge>{model.statusLabel}</Badge></View>
      <Text style={[s.title, s.heroTitle]}>{model.title}</Text><Text style={[s.small, s.onHero]}>{model.timeLabel}</Text>
      <View style={s.between}>{model.progress.map(item => <View key={item.label}><Text style={[s.title, s.accentText]}>{item.value}</Text><Text style={[s.small, s.onHero]}>{item.label}</Text></View>)}</View>
    </Card><View style={s.metrics}>{model.metrics.map(metric => <View style={s.metric} key={metric.label}><Copy small>{metric.label}</Copy><Text style={s.title}>{metric.value}</Text></View>)}</View>
    <View style={s.between}><Heading>{en.attention}</Heading></View>
    {model.groups.map(group => <View key={group.title} style={s.stack}><View style={s.between}><Heading>{group.title}</Heading><Badge>{group.items.length}</Badge></View>
      {group.items.map(item => <WorkItem key={item.key} item={item} />)}</View>)}
    {model.groups.every(group => !group.items.length) && <Card><Heading>{en.allClear}</Heading><Copy>{en.allClearCopy}</Copy></Card>}
    <Button label={en.newIncident} onPress={onNewIncident} />
  </>;
}
export type HomeView = { eventTitle: string; subtitle: string; needsArrival: boolean; questions: WorkCard[]; offers: WorkCard[]; current: WorkCard[]; next: WorkCard[] };
export function ParticipantHome({ model, onHere, pending = false, offline = false }: {model: HomeView; onHere: () => void; pending?: boolean; offline?: boolean}) {
  const groups = [{title: en.questions, items: model.questions}, {title: en.offers, items: model.offers}, {title: en.currentTask, items: model.current}, {title: en.nextTask, items: model.next}];
  return <><Brand /><PageTitle eyebrow={model.eventTitle} title={en.homeTitle} subtitle={en.homeCopy} />
    <Card hero><Text style={[s.heading, s.heroTitle]}>{model.subtitle}</Text><Text style={[s.small, s.onHero]}>{en.tagline}</Text>
      {model.needsArrival && <Button label={en.here} onPress={onHere} pending={pending} disabled={offline} variant="accent" />}</Card>
    {groups.filter(group => group.items.length > 0).map(group => <View key={group.title} style={s.stack}><Heading>{group.title}</Heading>{group.items.map(item => <WorkItem key={item.key} item={item} />)}</View>)}
    {groups.every(group => !group.items.length) && <Card><Heading>{en.noTasks}</Heading><Copy>{en.noTasksCopy}</Copy></Card>}
  </>;
}
