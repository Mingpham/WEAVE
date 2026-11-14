import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { styles as s } from '@/theme';
import { workEn as w } from '@/strings/en';
import { useAcknowledgedAction } from '@/features/shared/use-acknowledged-action';
import { ActionFeedback, Tick } from './common';

// Text field values and selection keys only. The API adapter validates/translates
// these into contracts; this screen never sends a domain DTO itself.
export type TaskEditDraft = {
  titleInput: string; descriptionInput: string; areaKey: string; roleKey?: string; roleRequired: boolean;
  startsInput: string; dueInput: string; durationInput: string; stipendInput: string; critical: boolean; hardDeadline: boolean;
  criteria: {key: string; textInput: string; critical: boolean; photoExpected: boolean}[];
  dependencies: {key: string; required: boolean}[];
  resources: {key: string; resourceKey?: string; useCategory: boolean; categoryInput: string; required: boolean}[];
};
export type TaskEditorProps = {versionKey: string; title: string; initial: TaskEditDraft; currencyLabel: string;
  areas: {key: string; label: string}[]; roles: {key: string; label: string}[];
  dependencies: {key: string; label: string}[]; resources: {key: string; label: string}[];
  limits: {titleMin: number; titleMax: number; descriptionMax: number; criterionMax: number; criteriaMax: number};
  canEdit: boolean; offline?: boolean; demo?: boolean; onSave: (draft: TaskEditDraft) => Promise<void>};
export function TaskEditor(props: TaskEditorProps) {return <EditorForm key={props.versionKey} {...props} />;}
function EditorForm({versionKey, title, initial, currencyLabel, areas, roles, dependencies, resources, limits, canEdit, offline, demo, onSave}: TaskEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [nextCriterion, setNextCriterion] = useState(initial.criteria.length);
  const [nextRequirement, setNextRequirement] = useState(initial.resources.length);
  const action = useAcknowledgedAction(versionKey);
  const disabled = offline || !canEdit || action.pending || action.acknowledged || action.stale;
  const patch = (values: Partial<TaskEditDraft>) => {action.reset(); setDraft({...draft, ...values});};
  const dateValid = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
  const valid = draft.titleInput.trim().length >= limits.titleMin && draft.titleInput.length <= limits.titleMax
    && draft.descriptionInput.length <= limits.descriptionMax && areas.some(area => area.key === draft.areaKey)
    && (!draft.roleRequired || roles.some(role => role.key === draft.roleKey)) && dateValid(draft.dueInput)
    && (!draft.startsInput || (dateValid(draft.startsInput) && Date.parse(draft.startsInput) < Date.parse(draft.dueInput)))
    && /^\d+$/.test(draft.durationInput) && Number(draft.durationInput) > 0
    && (!draft.stipendInput || (/^\d+$/.test(draft.stipendInput) && Number.isSafeInteger(Number(draft.stipendInput))))
    && draft.criteria.length > 0 && draft.criteria.length <= limits.criteriaMax
    && draft.criteria.every(item => item.textInput.trim().length > 0 && item.textInput.length <= limits.criterionMax)
    && draft.resources.every(item => item.useCategory ? !!item.categoryInput.trim() : resources.some(resource => resource.key === item.resourceKey));
  return <><PageTitle title={title} subtitle={w.editCopy} />{!canEdit && <Notice>{w.formUnavailable}</Notice>}
    <Field label={w.title} value={draft.titleInput} maxLength={limits.titleMax} disabled={disabled} onChangeText={titleInput => patch({titleInput})} />
    <Field label={w.description} value={draft.descriptionInput} maxLength={limits.descriptionMax} disabled={disabled} multiline onChangeText={descriptionInput => patch({descriptionInput})} />
    <Card><Heading>{w.area}</Heading>{areas.map(item => <Choice key={item.key} label={item.label} selected={draft.areaKey === item.key} disabled={disabled} onPress={() => patch({areaKey: item.key})} />)}</Card>
    <Card><Heading>{w.role}</Heading><Choice label={w.noRole} selected={!draft.roleKey} disabled={disabled} onPress={() => patch({roleKey: undefined, roleRequired: false})} />
      {roles.map(item => <Choice key={item.key} label={item.label} selected={draft.roleKey === item.key} disabled={disabled} onPress={() => patch({roleKey: item.key})} />)}
      <Tick label={w.roleRequired} checked={draft.roleRequired} disabled={disabled || !draft.roleKey} onChange={() => patch({roleRequired: !draft.roleRequired})} /></Card>
    <Card><Field label={w.starts} value={draft.startsInput} disabled={disabled} onChangeText={startsInput => patch({startsInput})} />
      <Field label={w.dueInput} value={draft.dueInput} disabled={disabled} onChangeText={dueInput => patch({dueInput})} /><Copy small>{w.dateHint}</Copy>
      <Field label={w.duration} value={draft.durationInput} disabled={disabled} onChangeText={durationInput => patch({durationInput})} />
      <Tick label={w.hardDeadline} checked={draft.hardDeadline} disabled={disabled} onChange={() => patch({hardDeadline: !draft.hardDeadline})} />
      <Tick label={w.critical} checked={draft.critical} disabled={disabled} onChange={() => patch({critical: !draft.critical})} />
      <Field label={`${w.stipend} · ${currencyLabel}`} value={draft.stipendInput} disabled={disabled} onChangeText={stipendInput => patch({stipendInput})} /></Card>
    <Heading>{w.criteria}</Heading>{draft.criteria.map(item => <Card key={item.key}>
      <Field label={w.criterionText} value={item.textInput} maxLength={limits.criterionMax} disabled={disabled}
        onChangeText={textInput => patch({criteria: draft.criteria.map(criterion => criterion.key === item.key ? {...criterion, textInput} : criterion)})} />
      <Tick label={w.critical} checked={item.critical} disabled={disabled} onChange={() => patch({criteria: draft.criteria.map(criterion => criterion.key === item.key ? {...criterion, critical: !criterion.critical} : criterion)})} />
      <Tick label={w.photoExpected} checked={item.photoExpected} disabled={disabled} onChange={() => patch({criteria: draft.criteria.map(criterion => criterion.key === item.key ? {...criterion, photoExpected: !criterion.photoExpected} : criterion)})} />
      <Button label={w.removeCriterion} disabled={disabled || draft.criteria.length <= 1} variant="secondary" onPress={() => patch({criteria: draft.criteria.filter(criterion => criterion.key !== item.key)})} />
    </Card>)}
    <Button label={w.addCriterion} disabled={disabled || draft.criteria.length >= limits.criteriaMax} variant="secondary" onPress={() => {
      let index = nextCriterion;
      while (draft.criteria.some(item => item.key === `new-criterion-${index}`)) index++;
      const key = `new-criterion-${index}`; setNextCriterion(index + 1);
      patch({criteria: [...draft.criteria, {key, textInput: '', critical: false, photoExpected: false}]});
    }} />
    <Card><Heading>{w.dependencies}</Heading>{dependencies.map(item => {const chosen = draft.dependencies.find(dependency => dependency.key === item.key); return <View key={item.key} style={s.stack}>
      <Tick label={item.label} checked={!!chosen} disabled={disabled} onChange={() => patch({dependencies: chosen ? draft.dependencies.filter(dependency => dependency.key !== item.key) : [...draft.dependencies, {key: item.key, required: true}]})} />
      {chosen && <Tick label={w.requiredDependency} checked={chosen.required} disabled={disabled} onChange={() => patch({dependencies: draft.dependencies.map(dependency => dependency.key === item.key ? {...dependency, required: !dependency.required} : dependency)})} />}
    </View>;})}</Card>
    <Heading>{w.resources}</Heading>{draft.resources.map(item => <Card key={item.key}>
      <Choice label={w.specificResource} selected={!item.useCategory} disabled={disabled}
        onPress={() => patch({resources: draft.resources.map(need => need.key === item.key ? {...need, useCategory: false, categoryInput: ''} : need)})} />
      <Choice label={w.categoryResource} selected={item.useCategory} disabled={disabled}
        onPress={() => patch({resources: draft.resources.map(need => need.key === item.key ? {...need, useCategory: true, resourceKey: undefined} : need)})} />
      {item.useCategory ? <Field label={w.resourceCategory} value={item.categoryInput} disabled={disabled}
        onChangeText={categoryInput => patch({resources: draft.resources.map(need => need.key === item.key ? {...need, categoryInput} : need)})} />
        : resources.map(resource => <Choice key={resource.key} label={resource.label} selected={item.resourceKey === resource.key} disabled={disabled}
          onPress={() => patch({resources: draft.resources.map(need => need.key === item.key ? {...need, resourceKey: resource.key} : need)})} />)}
      <Tick label={w.resourceRequired} checked={item.required} disabled={disabled}
        onChange={() => patch({resources: draft.resources.map(need => need.key === item.key ? {...need, required: !need.required} : need)})} />
      <Button label={w.removeRequirement} disabled={disabled} variant="secondary" onPress={() => patch({resources: draft.resources.filter(need => need.key !== item.key)})} />
    </Card>)}
    <Button label={w.addRequirement} disabled={disabled} variant="secondary" onPress={() => {
      let index = nextRequirement;
      while (draft.resources.some(item => item.key === `new-need-${index}`)) index++;
      const key = `new-need-${index}`; setNextRequirement(index + 1);
      patch({resources: [...draft.resources, {key, resourceKey: resources[0]?.key, useCategory: resources.length === 0, categoryInput: '', required: true}]});
    }} />
    {!valid && <Notice>{w.invalidTask}</Notice>}<Button label={w.saveTask} disabled={disabled || !valid} pending={action.pending} onPress={() => void action.run(() => onSave(draft))} />
    <ActionFeedback {...action} demo={demo} />
  </>;
}
