import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Brand, Button, Card, Copy, Heading, PageTitle } from '@/components/ui';
import { records as r } from '@/strings/records';
import { colors, radius, space, styles as s } from '@/theme';

export type RecordAction = () => void;
export type RecordMetric = { label: string; value: string };
export type TimelineEntry = { id: string; time: string; actor: string; title: string; detail: string; kind: string; source: string; onOpen: RecordAction };
export type TimelineModel = { eventTitle: string; dateLabel: string; filters: { label: string; selected: boolean; onSelect: RecordAction }[]; entries: TimelineEntry[]; onLoadMore?: RecordAction };
export function TimelineScreen({ model }: { model: TimelineModel }) {
  return <><Brand /><PageTitle eyebrow={model.eventTitle} title={r.timeline} subtitle={r.timelineCopy} />
    <View style={s.row}>{model.filters.map(filter => <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: filter.selected }} onPress={filter.onSelect} style={[local.filter, filter.selected && local.activeFilter]}><Text style={[s.small, filter.selected && local.activeText]}>{filter.label}</Text></Pressable>)}</View>
    <View style={s.between}><Heading>{r.activity}</Heading><Copy small>{model.dateLabel}</Copy></View>
    {model.entries.map(entry => <View key={entry.id} style={local.timelineRow}><View style={local.rail}><View style={local.dot} /><View style={local.line} /></View><View style={local.event}><Card><View style={s.between}><Badge>{entry.kind}</Badge><Copy small>{entry.time}</Copy></View><Heading>{entry.title}</Heading><Copy>{entry.detail}</Copy><Copy small>{entry.actor}</Copy><View style={s.divider} /><Copy small>{`${r.source}: ${entry.source}`}</Copy><Button label={r.openRecord} variant="secondary" onPress={entry.onOpen} /></Card></View></View>)}
    {model.onLoadMore && <Button label={r.loadMore} variant="secondary" onPress={model.onLoadMore} />}
  </>;
}
export type CloseReportModel = { eventTitle: string; status: string; closedAt: string; headline: string; source: string; metrics: RecordMetric[]; detailMetrics: RecordMetric[]; summary: { title: string; body: string; references: string[] }[]; outstanding: string[]; onSettlement: RecordAction };
function Metrics({ items }: { items: RecordMetric[] }) { return <View style={s.metrics}>{items.map(item => <View style={s.metric} key={item.label}><Text style={s.title}>{item.value}</Text><Copy small>{item.label}</Copy></View>)}</View>; }
export function CloseReportScreen({ model }: { model: CloseReportModel }) {
  return <><Brand /><PageTitle eyebrow={model.eventTitle} title={r.closeReport} subtitle={r.reportCopy} /><Card hero><View style={s.between}><Badge>{model.status}</Badge><Text style={[s.small, s.onHero]}>{model.closedAt}</Text></View><Text style={[s.title, s.heroTitle]}>{model.headline}</Text><Text style={[s.small, s.onHero]}>{model.source}</Text></Card><Heading>{r.finalResults}</Heading><Metrics items={model.metrics} /><Card>{model.detailMetrics.map(item => <View key={item.label} style={s.between}><Copy small>{item.label}</Copy><Text style={s.label}>{item.value}</Text></View>)}</Card><View style={s.between}><Heading>{r.summary}</Heading><Badge>AI</Badge></View>{model.summary.map(section => <Card key={section.title}><Heading>{section.title}</Heading><Copy>{section.body}</Copy><Copy small>{`${r.references}: ${section.references.join(' · ')}`}</Copy></Card>)}{model.outstanding.length > 0 && <Card><Heading>{r.outstanding}</Heading>{model.outstanding.map(item => <Copy key={item}>{item}</Copy>)}</Card>}<Button label={r.settlement} onPress={model.onSettlement} /></>;
}
export type LedgerEntry = { id: string; member: string; task: string; approvedAt: string; amount: string; status: string; onPaid: RecordAction; onVoid: RecordAction };
export type SettlementModel = { eventTitle: string; totalLabel: string; total: string; pending: string; paid: string; source: string; entries: LedgerEntry[]; onExport: RecordAction };
export function SettlementScreen({ model }: { model: SettlementModel }) {
  return <><Brand /><PageTitle eyebrow={model.eventTitle} title={r.settlement} subtitle={r.settlementCopy} /><Card hero><Text style={[s.eyebrow, s.onHero]}>{model.totalLabel}</Text><Text style={s.display}>{model.total}</Text><View style={s.between}><Text style={[s.small, s.onHero]}>{model.pending}</Text><Text style={[s.small, s.onHero]}>{model.paid}</Text></View></Card><Copy small>{r.settlementNote}</Copy><View style={s.between}><Heading>{r.ledger}</Heading><Badge>{model.entries.length}</Badge></View>{model.entries.map(entry => <Card key={entry.id}><View style={s.between}><Heading>{entry.member}</Heading><Text style={local.amount}>{entry.amount}</Text></View><Copy>{entry.task}</Copy><View style={s.between}><Badge tone={entry.status === 'PENDING' ? 'warning' : 'neutral'}>{entry.status.replaceAll('_', ' ')}</Badge><Copy small>{entry.approvedAt}</Copy></View>{entry.status === 'PENDING' && <><Button label={r.paid} variant="secondary" onPress={entry.onPaid} /><Button label={r.void} variant="secondary" onPress={entry.onVoid} /></>}</Card>)}<Copy small>{`${r.source}: ${model.source}`}</Copy><Button label={r.export} onPress={model.onExport} /></>;
}
export type InboxEntry = { id: string; title: string; body: string; eventTitle: string; time: string; kind: string; unread: boolean; onOpen: RecordAction; onMarkRead: RecordAction };
export type InboxModel = { unreadLabel: string; entries: InboxEntry[] };
export function InboxScreen({ model }: { model: InboxModel }) {
  return <><Brand /><PageTitle eyebrow={model.unreadLabel} title={r.inbox} subtitle={r.inboxCopy} />{[true, false].map(unread => <View style={s.stack} key={String(unread)}><Heading>{unread ? r.unread : r.earlier}</Heading>{model.entries.filter(entry => entry.unread === unread).map(entry => <View key={entry.id} style={unread ? local.unread : undefined}><Card><View style={s.between}><Badge tone={unread ? 'warning' : 'neutral'}>{entry.kind}</Badge><Copy small>{entry.time}</Copy></View><Heading>{entry.title}</Heading><Copy>{entry.body}</Copy><Copy small>{entry.eventTitle}</Copy><Button label={r.open} variant="secondary" onPress={entry.onOpen} />{unread && <Pressable accessibilityRole="button" onPress={entry.onMarkRead} style={local.readAction}><Text style={s.label}>{r.markRead}</Text></Pressable>}</Card></View>)}</View>)}</>;
}
const local = StyleSheet.create({
  filter: { paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  activeFilter: { backgroundColor: colors.forest, borderColor: colors.forest }, activeText: { color: colors.card },
  timelineRow: { flexDirection: 'row', gap: space.md }, rail: { width: 12, alignItems: 'center', paddingTop: space.lg },
  dot: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.sea }, line: { width: 1, flex: 1, backgroundColor: colors.line, marginTop: space.sm }, event: { flex: 1 },
  amount: { ...s.heading, color: colors.forest }, unread: { borderLeftWidth: 3, borderLeftColor: colors.sea, paddingLeft: space.sm }, readAction: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
});
