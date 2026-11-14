import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Heading, Notice, PageTitle } from '@/components/ui';
import { styles as s } from '@/theme';
import { workEn as w } from '@/strings/en';
import { useAcknowledgedAction } from '@/features/shared/use-acknowledged-action';
import { ActionFeedback } from './common';

export type AssignmentSuggestion = {key: string; title: string; dueLabel: string; respondByLabel: string;
  suggestedMemberKey?: string; members: {key: string; name: string; reason: string}[]};
export type OfferResultView = {taskKey: string; taskTitle: string; memberKey: string; memberLabel: string; sent: boolean; errorMessage?: string};
export type AssignProps = {versionKey: string; tasks: AssignmentSuggestion[]; results?: OfferResultView[]; offline?: boolean; demo?: boolean;
  canSend?: boolean; unavailableReason?: string; stale?: boolean; onRefresh?: () => void; refreshing?: boolean;
  onSend: (selections: {taskKey: string; memberKey: string}[]) => Promise<void>};
export function Assign(props: AssignProps) { return <AssignForm key={props.versionKey} {...props} />; }
function AssignForm({versionKey, tasks, results = [], offline, demo, onSend, canSend = true, unavailableReason, stale, onRefresh, refreshing}: AssignProps) {
  const [selected, setSelected] = useState<Record<string, string | undefined>>(() => Object.fromEntries(tasks.map(task => {
    const failed = results.find(result => result.taskKey === task.key && !result.sent);
    return [task.key, failed && task.members.some(member => member.key === failed.memberKey) ? failed.memberKey : task.suggestedMemberKey];
  })));
  const action = useAcknowledgedAction(versionKey);
  const remaining = tasks.filter(task => !results.some(result => result.taskKey === task.key && result.sent));
  const hasFailures = results.some(result => !result.sent);
  const selections = remaining.flatMap(task => {
    const memberKey = selected[task.key];
    return memberKey && task.members.some(member => member.key === memberKey) ? [{taskKey: task.key, memberKey}] : [];
  });
  const disabled = offline || !canSend || stale || refreshing || action.pending || (action.acknowledged && !hasFailures) || action.stale;
  return <><PageTitle title={w.assign} subtitle={w.assignCopy} /><Notice>{w.deterministic}</Notice>
    {offline && <Notice>{w.offlineActions}</Notice>}{!canSend && <Notice>{unavailableReason ?? w.unavailable}</Notice>}
    {stale && <Notice danger>{w.stale}</Notice>}
    {hasFailures && <Notice>{w.partialOffers}</Notice>}
    {results.map(result => <Card key={result.taskKey}><Heading>{result.taskTitle}</Heading><Copy>{result.memberLabel}</Copy>
      <Badge tone={result.sent ? 'neutral' : 'warning'}>{result.sent ? w.offerSent : w.offerFailed}</Badge>
      {!result.sent && result.errorMessage && <Notice danger>{result.errorMessage}</Notice>}</Card>)}
    {remaining.map(task => <Card key={task.key}><Heading>{task.title}</Heading><Copy small>{`${w.due}: ${task.dueLabel}`}</Copy>
      <Copy small>{`${w.respondBy}: ${task.respondByLabel}`}</Copy><Heading>{w.eligible}</Heading>
      {task.members.length === 0 && <Notice>{w.noEligible}</Notice>}
      {!!selected[task.key] && !task.members.some(member => member.key === selected[task.key]) && <Notice danger>{w.selectionChanged}</Notice>}
      <View accessibilityRole="radiogroup" accessibilityLabel={`${w.chooseMember}: ${task.title}`} style={s.stack}>{task.members.map(member => <View key={member.key} style={s.stack}>
        <Choice label={member.name} selected={selected[task.key] === member.key} disabled={disabled}
          onPress={() => setSelected({...selected, [task.key]: member.key})} />
        <Copy small>{member.reason}</Copy>{member.key === task.suggestedMemberKey && <Badge>{w.suggested}</Badge>}
      </View>)}<Choice label={w.skip} selected={!selected[task.key]} disabled={disabled} onPress={() => setSelected({...selected, [task.key]: undefined})} /></View>
    </Card>)}
    {remaining.length === 0 ? <Notice>{results.some(result => result.sent) && !hasFailures ? w.allOffersSent : w.noOpenTasks}</Notice> : selections.length === 0 && <Notice>{w.noOffers}</Notice>}
    {remaining.length > 0 && <Button label={w.sendOffers(selections.length)} disabled={disabled || selections.length === 0} pending={action.pending} onPress={() => void action.run(() => onSend(selections))} />}
    {onRefresh && <Button label={w.refresh} disabled={offline || action.pending || refreshing} onPress={onRefresh} variant="secondary" />}
    <ActionFeedback {...action} acknowledged={action.acknowledged && !hasFailures} demo={demo} />
  </>;
}
