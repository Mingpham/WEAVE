import { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { planningEn as p } from '@/strings/en';
import { styles as s } from '@/theme';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import type { PlanningChoice, PlanningEditorOptions, PlanningForm, PlanningItem, PlanningLink } from './models';
import { PlanningSelections, PlanningToggle } from './selection-list';

export type DraftItemEditorProps = {
  item: PlanningItem; form: PlanningForm; options: PlanningEditorOptions; revision: string;
  composing?: boolean; canEdit: boolean; offline?: boolean; demo?: boolean; isNew?: boolean; liveResource?: boolean;
  onChange: (form: PlanningForm) => void; onSave: (form: PlanningForm) => Promise<void>;
  onDelete: () => Promise<void>; onLock: (locked: boolean) => Promise<void>; onBack: () => void;
  onSource: (key: string) => void;
};
export function DraftItemEditor({item, form, options, revision, composing, canEdit, offline, demo, isNew, liveResource, onChange, onSave, onDelete, onLock, onBack, onSource}: DraftItemEditorProps) {
  const action = useAcknowledgedAction(revision);
  const [confirmDelete, setConfirmDelete] = useState<string>();
  const [confirmBack, setConfirmBack] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const busy = !!composing || action.pending || !canEdit;
  const dirty = JSON.stringify(form) !== JSON.stringify(item.form);
  const patch = (next: Partial<PlanningForm>) => { action.reset(); setConfirmDelete(undefined); onChange({...form, ...next}); };
  const field = (key: 'name' | 'description' | 'start' | 'due' | 'duration' | 'stipend' | 'category' | 'quantity' | 'custodian', label: string, multiline = false, maxLength = 1000) =>
    <View key={key} style={s.stack}><Field label={label} value={form[key]} multiline={multiline} maxLength={maxLength} disabled={busy} onChangeText={value => patch({[key]: value})} />
      {attempted && errors[key] && <Notice danger>{errors[key]}</Notice>}</View>;
  const flag = (key: 'critical' | 'hardDeadline' | 'roleRequired', label: string) => <PlanningToggle label={label} selected={form[key]} disabled={busy} onPress={() => patch({[key]: !form[key]})} />;
  const choose = (key: 'areaKey' | 'roleKey' | 'kindKey' | 'inventoryKey' | 'custodian', value: string) => patch({[key]: value, ...(key === 'roleKey' && !value ? {roleRequired: false} : {})});
  const select = (key: 'areaKey' | 'roleKey' | 'kindKey' | 'inventoryKey' | 'custodian', label: string, choices: PlanningChoice[], empty?: string) => <View style={s.stack}><Heading>{label}</Heading>
    {empty && <Choice label={empty} selected={!form[key]} disabled={busy} onPress={() => choose(key, '')} />}
    <PlanningSelections label={label} items={choices} selectedKeys={[form[key]]} disabled={busy} onChoose={value => choose(key, empty && form[key] === value ? '' : value)} />
    {attempted && errors[key] && <Notice danger>{errors[key]}</Notice>}</View>;
  const links = (key: 'dependencies' | 'needs', label: string, choices: PlanningChoice[]) => <Card><Heading>{label}</Heading>
    {!choices.length && <Copy small>{key === 'dependencies' ? p.noDependencies : p.emptyResources}</Copy>}
    <PlanningSelections label={label} items={choices} multiple selectedKeys={form[key].map(link => link.key)} disabled={busy}
      onChoose={value => patch({[key]: form[key].some(link => link.key === value) ? form[key].filter(link => link.key !== value) : [...form[key], {key: value, required: true}]})}
      details={value => <PlanningToggle label={`${p.hard} · ${choices.find(choice => choice.key === value)?.label ?? label}`} selected={!!form[key].find(link => link.key === value)?.required} disabled={busy}
        onPress={() => patch({[key]: form[key].map((link: PlanningLink) => link.key === value ? {...link, required: !link.required} : link)})} />} />
    {form[key].filter(link => !choices.some(choice => choice.key === link.key)).map(link => <Button key={link.key} label={p.removeReference} variant="secondary" disabled={busy}
      onPress={() => patch({[key]: form[key].filter(current => current.key !== link.key)})} />)}
    {attempted && errors[key] && <Notice danger>{errors[key]}</Notice>}</Card>;
  const integer = (value: string) => /^-?\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value));
  const positive = (value: string) => integer(value) && Number(value) > 0;
  const nonnegative = (value: string) => integer(value) && Number(value) >= 0;
  const errors: Partial<Record<keyof PlanningForm, string>> = {};
  if (!form.name.trim()) errors.name = p.nameRequired;
  if (item.kind === 'area') {
    if (form.name.trim().length > 60) errors.name = p.areaNameInvalid;
    if (form.description.length > 500) errors.description = p.areaNotesInvalid;
  }
  if ((item.kind === 'task' || (item.kind === 'resource' && !liveResource)) && form.areaKey && !options.areas.some(area => area.key === form.areaKey)) errors.areaKey = p.selectionInvalid;
  if (item.kind === 'task') {
    if (form.name.trim().length < 3 || form.name.trim().length > 80) errors.name = p.taskTitleInvalid;
    if (form.description.length > 1000) errors.description = p.descriptionInvalid;
    if (!integer(form.due)) errors.due = p.dueInvalid;
    if (form.start && !integer(form.start)) errors.start = p.startInvalid;
    if (!positive(form.duration)) errors.duration = p.durationInvalid;
    if (form.stipend && !nonnegative(form.stipend)) errors.stipend = p.stipendInvalid;
    if ((form.roleRequired || form.roleKey) && !options.roles.some(role => role.key === form.roleKey)) errors.roleKey = p.roleInvalid;
    if (form.criteria.length < 1 || form.criteria.length > 8 || form.criteria.some(row => !row.text.trim() || row.text.length > 200)) errors.criteria = p.criteriaInvalid;
    if (form.dependencies.some(link => link.key === item.key || !options.tasks.some(task => task.key === link.key))) errors.dependencies = p.selectionInvalid;
    if (form.needs.some(link => ![...options.resources, ...(options.resourceCategories ?? [])].some(resource => resource.key === link.key))) errors.needs = p.selectionInvalid;
  }
  if (item.kind === 'resource') {
    if (form.name.trim().length > 80) errors.name = p.resourceNameInvalid;
    if (!form.category.trim() || form.category.trim().length > 32) errors.category = p.categoryInvalid;
    if (form.description.length > 300) errors.description = p.resourceReasonInvalid;
    if (form.quantity && !nonnegative(form.quantity)) errors.quantity = p.quantityInvalid;
    if (!options.resourceKinds.some(kind => kind.key === form.kindKey)) errors.kindKey = p.resourceOptionsInvalid;
    if (!options.inventory.some(inventory => inventory.key === form.inventoryKey)) errors.inventoryKey = p.resourceOptionsInvalid;
    if (options.custodians && form.custodian && !options.custodians.some(member => member.key === form.custodian)) errors.custodian = p.selectionInvalid;
  }
  const valid = Object.keys(errors).length === 0;
  if (!canEdit) return <><PageTitle title={p.editItem} /><Notice>{p.permissions}</Notice><Button label={p.backEditing} variant="secondary" onPress={onBack} /></>;
  return <><PageTitle eyebrow={p.editItem} title={p.editorTitle} />
    <View style={s.row}><Badge>{item.ai ? p.ai : p.human}</Badge><Badge>{item.locked ? p.locked : p.unlocked}</Badge></View><Copy small>{`${p.source} · ${item.sourceLabel}`}</Copy>
    {isNew ? <Copy small>{p.sourceUnavailable}</Copy> : <Button label={p.viewSource} variant="secondary" onPress={() => onSource(`item:${item.key}`)} />}
    {composing && <Notice>{p.composing}</Notice>}{!canEdit && <Notice>{p.permissions}</Notice>}{offline && <Notice>{p.offline}</Notice>}
    <Card>{field('name', item.kind === 'task' ? p.title : p.name, false, item.kind === 'area' ? 60 : item.kind === 'role' ? 1000 : 80)}
      {item.kind !== 'role' && field('description', item.kind === 'area' ? p.areaNotes : item.kind === 'resource' ? p.reason : p.description, true, item.kind === 'area' ? 500 : item.kind === 'resource' ? 300 : 1000)}
      {item.kind === 'role' && <Copy small>{p.roleDescription}</Copy>}</Card>
    {item.kind === 'task' && <>
      <Card>{select('areaKey', p.area, options.areas, p.noArea)}{select('roleKey', p.role, options.roles, p.noRole)}{flag('roleRequired', p.roleRequired)}</Card>
      <Card><Heading>{p.timeline}</Heading><Copy small>{p.offsetHint}</Copy>{field('start', p.start)}{field('due', p.due)}{field('duration', p.duration)}{field('stipend', p.stipend)}{flag('critical', p.critical)}{flag('hardDeadline', p.hardDeadline)}</Card>
      <Card><Heading>{p.criteria}</Heading>{form.criteria.map((criterion, index) => <View key={index} style={s.stack}>
        <Field label={`${p.criterion} ${index + 1}`} value={criterion.text} maxLength={200} disabled={busy} onChangeText={text => patch({criteria: form.criteria.map((row, i) => i === index ? {...row, text} : row)})} />
        <View style={s.row}><PlanningToggle label={`${p.critical} · ${index + 1}`} selected={criterion.critical} disabled={busy} onPress={() => patch({criteria: form.criteria.map((row, i) => i === index ? {...row, critical: !row.critical} : row)})} />
          <PlanningToggle label={`${p.photoExpected} · ${index + 1}`} selected={criterion.photo} disabled={busy} onPress={() => patch({criteria: form.criteria.map((row, i) => i === index ? {...row, photo: !row.photo} : row)})} /></View>
        <Button label={`${p.remove} · ${p.criterion} ${index + 1}`} variant="secondary" disabled={busy} onPress={() => patch({criteria: form.criteria.filter((_, i) => i !== index)})} /></View>)}
        <Button label={p.addCriterion} variant="secondary" disabled={busy || form.criteria.length >= 8} onPress={() => patch({criteria: [...form.criteria, {text: '', critical: false, photo: false}]})} /></Card>
      {links('dependencies', p.dependencies, options.tasks.filter(task => task.key !== item.key))}{links('needs', p.needs, [...options.resources, ...(options.resourceCategories ?? [])])}
    </>}
    {item.kind === 'resource' && <>
      <Card>{field('category', p.category, false, 32)}{select('kindKey', p.resourceKind, options.resourceKinds)}{field('quantity', p.quantity)}
        {options.custodians ? select('custodian', p.custodian, options.custodians, p.custodianUnknown) : field('custodian', p.custodian, false, 100)}
        {liveResource ? <Notice>{p.statusEvidence}</Notice> : select('areaKey', p.area, options.areas, p.noArea)}</Card>
      <Card><Copy small>{p.inventoryHelp}</Copy>{select('inventoryKey', p.inventory, options.inventory)}
        {form.inventoryKey === options.acquisitionKey && <Notice>{p.acquisitionHint}</Notice>}
        {!isNew && <Button label={p.notNeeded} variant="secondary" disabled={busy || offline} onPress={() => {Keyboard.dismiss(); setConfirmDelete(revision);}} />}</Card>
    </>}
    <Copy small>{p.lockHint}</Copy>{attempted && !valid && <Notice danger>{`${p.fixFields}\n${Object.values(errors).join('\n')}`}</Notice>}
    {action.error && <Notice danger>{action.error}</Notice>}{action.stale && <Notice danger>{p.stale}</Notice>}{action.acknowledged && <Notice>{demo ? p.savedDemo : p.saved}</Notice>}
    <Button label={p.save} pending={action.pending} disabled={busy || offline || action.stale} onPress={() => {Keyboard.dismiss(); setAttempted(true); if (valid) void action.run(() => onSave(form));}} />
    {!isNew && <><Button label={item.locked ? p.unlock : p.lock} variant="secondary" disabled={busy || offline || action.stale} onPress={() => void action.run(() => onLock(!item.locked))} />
      {confirmDelete === revision ? <Card><Heading>{p.deleteConfirm}</Heading><Copy>{item.kind === 'resource' ? p.deleteResourceCopy : item.kind === 'area' ? p.deleteAreaCopy : p.deleteCopy}</Copy><Button label={p.confirmDelete} variant="danger" disabled={busy || offline || action.stale} onPress={() => void action.run(onDelete)} /><Button label={p.cancel} variant="secondary" disabled={busy} onPress={() => setConfirmDelete(undefined)} /></Card>
        : <Button label={p.delete} variant="danger" disabled={busy || offline} onPress={() => {Keyboard.dismiss(); setConfirmDelete(revision);}} />}</>}
    <Button label={p.backEditing} variant="secondary" disabled={action.pending} onPress={() => {Keyboard.dismiss(); if (dirty) setConfirmBack(true); else onBack();}} />
    {confirmBack && <Card><Heading>{p.discardTitle}</Heading><Copy>{p.discardCopy}</Copy><Button label={p.discard} variant="danger" disabled={busy} onPress={onBack} /><Button label={p.keepEditing} variant="secondary" onPress={() => setConfirmBack(false)} /></Card>}
  </>;
}
