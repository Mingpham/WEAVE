import type { PropsWithChildren } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Button, Card, Copy, Field, Heading, Notice } from '@/components/ui';
import { colors, styles as s } from '@/theme';
import { onboardingEn as t } from '@/strings/en';
import type { useAcknowledgedAction } from '../shared/use-acknowledged-action';

export type Action = () => Promise<void>;
export type EditableProfile = { nickname: string; roleKeys: string[]; wholeEvent: boolean; windows: { start: string; end: string }[] };
export type Option = { key: string; label: string };
export function Feedback({ action, demo }: { action: ReturnType<typeof useAcknowledgedAction>; demo?: boolean }) {
  return <>{action.error ? <Notice danger>{action.error}</Notice> : null}{action.acknowledged ? <Notice>{demo ? t.demoAck : t.acknowledged}</Notice> : null}</>;
}
export function Confirm({ title, detail, pending, disabled, onConfirm, onCancel, children }: PropsWithChildren<{
  title: string; detail: string; pending?: boolean; disabled?: boolean; onConfirm: () => void; onCancel: () => void;
}>) {
  return <Card><Heading>{title}</Heading><Notice danger>{detail}</Notice>{children}
    <Button label={title} variant="danger" disabled={disabled} pending={pending} onPress={onConfirm} />
    <Button label={t.cancel} variant="secondary" disabled={pending} onPress={onCancel} /></Card>;
}
export function Toggle({ label, detail, value, onChange, disabled = false }: {
  label: string; detail?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean;
}) {
  return <View style={s.stack}><View style={s.between}><Text style={[s.body, s.grow]}>{label}</Text>
    <Switch accessibilityLabel={label} accessibilityState={{ disabled, checked: value }} disabled={disabled} value={value} onValueChange={onChange}
      trackColor={{ false: colors.line, true: colors.sea }} thumbColor={colors.card} /></View>{detail ? <Copy small>{detail}</Copy> : null}</View>;
}
export function Check({ label, checked, onPress, disabled }: { label: string; checked: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress}
    style={[s.choice, checked && s.selected, disabled && s.disabled]}><Text style={s.body}>{checked ? '☑ ' : '☐ '}{label}</Text></Pressable>;
}
export function validWindow(value: { start: string; end: string }) {
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  const validTime = (text: string) => {
    if (!pattern.test(text)) return false;
    const date = new Date(`${text}:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === text;
  };
  return validTime(value.start) && validTime(value.end) && value.end > value.start;
}
export function validProfile(value: EditableProfile) {
  return value.nickname.trim().length >= 2 && value.nickname.trim().length <= 24 && value.roleKeys.length > 0 &&
    (value.wholeEvent || (value.windows.length > 0 && value.windows.every(validWindow)));
}
export function ProfileFields({ value, onChange, roles, disabled, timezone }: {
  value: EditableProfile; onChange: (value: EditableProfile) => void; roles: Option[]; disabled?: boolean; timezone: string;
}) {
  const patch = (changes: Partial<EditableProfile>) => onChange({ ...value, ...changes });
  return <><Card><Field label={t.nickname} value={value.nickname} maxLength={24} disabled={disabled} onChangeText={nickname => patch({ nickname })} /><Copy small>{t.nicknameHint}</Copy>
    <Heading>{t.roles}</Heading>{roles.map(role => <Check key={role.key} label={role.label} checked={value.roleKeys.includes(role.key)} disabled={disabled}
      onPress={() => patch({ roleKeys: value.roleKeys.includes(role.key) ? value.roleKeys.filter(key => key !== role.key) : [...value.roleKeys, role.key] })} />)}</Card>
    <Card><Heading>{t.availability}</Heading><Copy small>{timezone}</Copy><Toggle label={t.wholeEvent} value={value.wholeEvent} disabled={disabled} onChange={wholeEvent => patch({ wholeEvent })} />
      {!value.wholeEvent ? <><Copy small>{t.timeFormat}</Copy>{value.windows.map((window, index) => <View key={index} style={s.stack}>
        <Field label={`${t.start} ${index + 1}`} value={window.start} disabled={disabled} onChangeText={start => patch({ windows: value.windows.map((item, i) => i === index ? { ...item, start } : item) })} />
        <Field label={`${t.end} ${index + 1}`} value={window.end} disabled={disabled} onChangeText={end => patch({ windows: value.windows.map((item, i) => i === index ? { ...item, end } : item) })} />
        <Button label={t.removeWindow} variant="secondary" disabled={disabled} onPress={() => patch({ windows: value.windows.filter((_, i) => i !== index) })} /></View>)}
        <Button label={t.addWindow} variant="secondary" disabled={disabled} onPress={() => patch({ windows: [...value.windows, { start: '', end: '' }] })} /></> : null}</Card></>;
}
