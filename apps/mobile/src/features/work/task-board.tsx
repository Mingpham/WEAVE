import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Heading, PageTitle } from '@/components/ui';
import { styles as s } from '@/theme';
import { workEn as w } from '@/strings/en';

export type TaskCardView = {
  key: string; title: string; statusLabel: string; areaLabel: string; assigneeLabel: string; dueLabel: string;
  riskLabel?: string; mine: boolean; atRisk: boolean; unassigned: boolean; onOpen: () => void;
};
export type TaskBoardProps = {tasks: TaskCardView[]; onAdd?: () => void; onSuggest?: () => void; offline?: boolean};
export function TaskBoard({tasks, onAdd, onSuggest, offline}: TaskBoardProps) {
  const [filter, setFilter] = useState('all');
  const [byArea, setByArea] = useState(false);
  const visible = tasks.filter(task => filter === 'mine' ? task.mine : filter === 'risk' ? task.atRisk : filter === 'unassigned' ? task.unassigned : true);
  const groups = [...new Set(visible.map(task => byArea ? task.areaLabel : task.statusLabel))];
  return <><PageTitle title={w.tasks} subtitle={w.tasksCopy} />
    <View style={s.row}>{[{key: 'all', label: w.all}, {key: 'mine', label: w.mine}, {key: 'risk', label: w.atRisk}, {key: 'unassigned', label: w.unassigned}].map(item =>
      <Choice key={item.key} label={item.label} selected={filter === item.key} onPress={() => setFilter(item.key)} />)}</View>
    <Heading>{w.groupBy}</Heading><View style={s.row}><Choice label={w.byStatus} selected={!byArea} onPress={() => setByArea(false)} />
      <Choice label={w.byArea} selected={byArea} onPress={() => setByArea(true)} /></View>
    {groups.map(group => <View key={group} style={s.stack}><Heading>{group}</Heading>{visible.filter(task => (byArea ? task.areaLabel : task.statusLabel) === group).map(task =>
      <Card key={task.key}><View style={s.row}><Badge>{task.statusLabel}</Badge>{task.riskLabel && <Badge tone="warning">{task.riskLabel}</Badge>}</View>
        <Heading>{task.title}</Heading><Copy>{task.areaLabel}</Copy><Copy small>{`${task.assigneeLabel} · ${task.dueLabel}`}</Copy>
        <Button label={w.openTask} onPress={task.onOpen} variant="secondary" /></Card>)}</View>)}
    {visible.length === 0 && <Card><Copy>{w.noTasks}</Copy><Button label={w.clearFilters} onPress={() => setFilter('all')} variant="secondary" /></Card>}
    {onAdd && <Button label={w.addTask} disabled={offline} onPress={onAdd} />}
    {onSuggest && <Button label={w.suggest} disabled={offline} onPress={onSuggest} variant="secondary" />}
  </>;
}
