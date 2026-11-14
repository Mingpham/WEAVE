import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { planningEn as p } from '@/strings/en';
import { styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import type { PlanningChoice, PlanningEditorOptions, PlanningForm, PlanningItem, PlanningLink } from './models';

export type DraftItemEditorProps = {
  item: PlanningItem; form: PlanningForm; options: PlanningEditorOptions; revision: string;
  composing?: boolean; canEdit: boolean; offline?: boolean; demo?: boolean; isNew?: boolean; liveResource?: boolean;
  onChange: (form: PlanningForm) => void; onSave: (form: PlanningForm) => Promise<void>;
  onDelete: () => Promise<void>; onLock: (locked: boolean) => Promise<void>; onBack: () => void;
  onSource: (key: string) => void;
};
export function DraftItemEditor({item, form, options, revision, composing, canEdit, offline, demo, isNew, liveResource, onChange, onSave, onDelete, onLock, onBack, onSource}: DraftItemEditorProps) {
  const action = useAcknowledgedAction(revision);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const busy = !!composing || action.pending || !canEdit;
  const patch = (next: Partial<PlanningForm>) => { action.reset(); onChange({...form, ...next}); };
  const field = (key: 'name' | 'description' | 'start' | 'due' | 'duration' | 'stipend' | 'category' | 'quantity' | 'custodian', label: string, multiline = false, maxLength = 1000) =>
    <Field key={key} label={label} value={form[key]} multiline={multiline} maxLength={maxLength} disabled={busy} onChangeText={value => patch({[key]: value})} />;
  const flag = (key: 'critical' | 'hardDeadline' | 'roleRequired', label: string) => <Choice label={label} selected={form[key]} disabled={busy} onPress={() => patch({[key]: !form[key]})} />;
  const select = (key: 'areaKey' | 'roleKey' | 'kindKey' | 'inventoryKey', label: string, choices: PlanningChoice[], empty?: string) => <View style={s.stack}><Heading>{label}</Heading>
    {empty && <Choice label={empty} selected={!form[key]} disabled={busy} onPress={() => patch({[key]: ''})} />}
    {choices.map(choice => <Choice key={choice.key} label={choice.label} selected={form[key] === choice.key} disabled={busy} onPress={() => patch({[key]: choice.key})} />)}</View>;
  const links = (key: 'dependencies' | 'needs', label: string, choices: PlanningChoice[]) => <Card><Heading>{label}</Heading>
    {!choices.length && <Copy small>{key === 'dependencies' ? p.noDependencies : p.emptyResources}</Copy>}
    {choices.map(choice => { const selected = form[key].find(link => link.key === choice.key); return <View key={choice.key} style={s.stack}>
      <Choice label={choice.label} selected={!!selected} disabled={busy} onPress={() => patch({[key]: selected ? form[key].filter(link => link.key !== choice.key) : [...form[key], {key: choice.key, required: true}]})} />
      {selected && <Choice label={`${p.hard} · ${choice.label}`} selected={selected.required} disabled={busy} onPress={() => patch({[key]: form[key].map((link: PlanningLink) => link.key === choice.key ? {...link, required: !link.required} : link)})} />}
    </View>; })}</Card>;
  const integer = (value: string) => /^-?\d+$/.test(value.trim());
  const positive = (value: string) => integer(value) && Number(value) > 0;
  const nonnegative = (value: string) => integer(value) && Number(value) >= 0;
  const validTask = form.name.trim().length >= 3 && form.name.length <= 80 && integer(form.due) && (!form.start || integer(form.start))
    && positive(form.duration) && (!form.stipend || nonnegative(form.stipend)) && (!form.roleRequired || !!form.roleKey)
    && form.criteria.length >= 1 && form.criteria.length <= 8 && form.criteria.every(row => row.text.trim().length > 0 && row.text.length <= 200);
  const validResource = !!form.name.trim() && !!form.category.trim() && (!form.quantity || (Number.isFinite(Number(form.quantity)) && Number(form.quantity) >= 0));
  const valid = item.kind === 'task' ? validTask : item.kind === 'resource' ? validResource : !!form.name.trim();
  if (!canEdit) return <><PageTitle title={p.editItem} /><Notice>{p.permissions}</Notice><Button label={p.backEditing} variant="secondary" onPress={onBack} /></>;
  return <><PageTitle eyebrow={p.editItem} title={p.editorTitle} />
    <View style={s.row}><Badge>{item.ai ? p.ai : p.human}</Badge><Badge>{item.locked ? p.locked : p.unlocked}</Badge></View><Copy small>{`${p.source} · ${item.sourceLabel}`}</Copy>
    {isNew ? <Copy small>{p.sourceUnavailable}</Copy> : <Button label={p.viewSource} variant="secondary" onPress={() => onSource(`item:${item.key}`)} />}
    {composing && <Notice>{p.composing}</Notice>}{!canEdit && <Notice>{p.permissions}</Notice>}{offline && <Notice>{p.offline}</Notice>}
    <Card>{field('name', item.kind === 'task' ? p.title : p.name, false, item.kind === 'task' ? 80 : 100)}
      {item.kind !== 'role' && field('description', item.kind === 'area' ? p.areaNotes : item.kind === 'resource' ? p.reason : p.description, true)}
      {item.kind === 'role' && <Copy small>{p.roleDescription}</Copy>}</Card>
    {item.kind === 'task' && <>
      <Card>{select('areaKey', p.area, options.areas, p.noArea)}{select('roleKey', p.role, options.roles, p.noRole)}{flag('roleRequired', p.roleRequired)}</Card>
      <Card><Heading>{p.timeline}</Heading><Copy small>{p.offsetHint}</Copy>{field('start', p.start)}{field('due', p.due)}{field('duration', p.duration)}{field('stipend', p.stipend)}{flag('critical', p.critical)}{flag('hardDeadline', p.hardDeadline)}</Card>
      <Card><Heading>{p.criteria}</Heading>{form.criteria.map((criterion, index) => <View key={index} style={s.stack}>
        <Field label={`${p.criterion} ${index + 1}`} value={criterion.text} maxLength={200} disabled={busy} onChangeText={text => patch({criteria: form.criteria.map((row, i) => i === index ? {...row, text} : row)})} />
        <View style={s.row}><Choice label={`${p.critical} · ${index + 1}`} selected={criterion.critical} disabled={busy} onPress={() => patch({criteria: form.criteria.map((row, i) => i === index ? {...row, critical: !row.critical} : row)})} />
          <Choice label={`${p.photoExpected} · ${index + 1}`} selected={criterion.photo} disabled={busy} onPress={() => patch({criteria: form.criteria.map((row, i) => i === index ? {...row, photo: !row.photo} : row)})} /></View>
        <Button label={`${p.remove} · ${p.criterion} ${index + 1}`} variant="secondary" disabled={busy} onPress={() => patch({criteria: form.criteria.filter((_, i) => i !== index)})} /></View>)}
        <Button label={p.addCriterion} variant="secondary" disabled={busy || form.criteria.length >= 8} onPress={() => patch({criteria: [...form.criteria, {text: '', critical: false, photo: false}]})} /></Card>
      {links('dependencies', p.dependencies, options.tasks.filter(task => task.key !== item.key))}{links('needs', p.needs, [...options.resources, ...(options.resourceCategories ?? [])])}
    </>}
    {item.kind === 'resource' && <>
      <Card>{field('category', p.category, false, 80)}{select('kindKey', p.resourceKind, options.resourceKinds)}{field('quantity', p.quantity)}{field('custodian', p.custodian, false, 100)}
        {liveResource ? <Notice>{p.statusEvidence}</Notice> : select('areaKey', p.area, options.areas, p.noArea)}</Card>
      <Card><Copy small>{p.inventoryHelp}</Copy>{select('inventoryKey', p.inventory, options.inventory)}
        {form.inventoryKey === options.acquisitionKey && <Notice>{p.acquisitionHint}</Notice>}
        {!isNew && <Button label={p.notNeeded} variant="secondary" disabled={busy || offline} onPress={() => setConfirmDelete(true)} />}</Card>
    </>}
    <Copy small>{p.lockHint}</Copy>{!valid && <Notice>{item.kind === 'resource' ? p.resourceValidation : p.validation}</Notice>}
    {action.error && <Notice danger>{action.error}</Notice>}{action.stale && <Notice danger>{p.stale}</Notice>}{action.acknowledged && <Notice>{demo ? p.savedDemo : p.saved}</Notice>}
    <Button label={p.save} pending={action.pending} disabled={busy || offline || !valid || action.stale} onPress={() => void action.run(() => onSave(form))} />
    {!isNew && <><Button label={item.locked ? p.unlock : p.lock} variant="secondary" disabled={busy || offline || action.stale} onPress={() => void action.run(() => onLock(!item.locked))} />
      {confirmDelete ? <Card><Heading>{p.deleteConfirm}</Heading><Copy>{p.deleteCopy}</Copy><Button label={p.confirmDelete} variant="danger" disabled={busy || offline || action.stale} onPress={() => void action.run(onDelete)} /><Button label={p.cancel} variant="secondary" disabled={busy} onPress={() => setConfirmDelete(false)} /></Card>
        : <Button label={p.delete} variant="danger" disabled={busy || offline} onPress={() => setConfirmDelete(true)} />}</>}
    <Button label={p.backEditing} variant="secondary" disabled={action.pending} onPress={onBack} />
  </>;
}
