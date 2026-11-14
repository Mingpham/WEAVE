import { useState, type PropsWithChildren } from 'react';
import { Pressable, Switch, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Button, Card, Copy, Heading, Notice } from '@/components/ui';
import { colors, styles as s } from '@/theme';
import { onboardingEn as t, onboardingFormEn as f } from '@/strings/en';
import { isValidLocalDateTime, LocalDateTimeField } from '@/components/local-date-time-field';
import type { useAcknowledgedAction } from '../shared/use-acknowledged-action';

export type Action = () => Promise<void>;
export type EditableProfile = { nickname: string; roleKeys: string[]; wholeEvent: boolean; windows: { start: string; end: string }[] };
export type Option = { key: string; label: string };
export function FormHint({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  return <Text accessibilityLiveRegion={error ? 'polite' : 'none'} style={[s.small, error && { color: colors.danger }]}>{children}</Text>;
}
export function FormField({ label, value, onChangeText, hint, error, showError = false, disabled, maxLength = 1000, multiline = false, keyboardType, autoCapitalize }: {
  label: string; value: string; onChangeText: (value: string) => void; hint?: string; error?: string; showError?: boolean; disabled?: boolean;
  maxLength?: number; multiline?: boolean; keyboardType?: KeyboardTypeOptions; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const [touched, setTouched] = useState(false);
  const visibleError = (touched || showError) && error;
  return <View style={s.stack}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} accessibilityHint={visibleError || hint}
    value={value} onChangeText={onChangeText} onBlur={() => setTouched(true)} editable={!disabled} maxLength={maxLength} multiline={multiline}
    keyboardType={keyboardType} autoCapitalize={autoCapitalize} placeholderTextColor={colors.muted}
    style={[s.input, multiline && s.multiline, visibleError && { borderColor: colors.danger }, disabled && s.disabled]} />
    {visibleError ? <FormHint error>{visibleError}</FormHint> : hint ? <FormHint>{hint}</FormHint> : null}</View>;
}
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
  return isValidLocalDateTime(value.start) && isValidLocalDateTime(value.end) && value.end > value.start;
}
export function validProfile(value: EditableProfile) {
  return value.nickname.trim().length >= 2 && value.nickname.trim().length <= 24 && value.roleKeys.length > 0 && value.roleKeys.length <= 10 &&
    (value.wholeEvent || (value.windows.length > 0 && value.windows.length <= 12 && value.windows.every(validWindow)));
}
export function ProfileFields({ value, onChange, roles, disabled, timezone, showErrors = false }: {
  value: EditableProfile; onChange: (value: EditableProfile) => void; roles: Option[]; disabled?: boolean; timezone: string; showErrors?: boolean;
}) {
  const patch = (changes: Partial<EditableProfile>) => onChange({ ...value, ...changes });
  return <><Card><FormField label={t.nickname} value={value.nickname} maxLength={24} disabled={disabled} onChangeText={nickname => patch({ nickname })}
    hint={t.nicknameHint} showError={showErrors} error={value.nickname.trim().length < 2 || value.nickname.trim().length > 24 ? f.nicknameError : undefined} />
    <Heading>{t.roles}</Heading><Copy small>{f.roleHint}</Copy>{roles.map(role => <Check key={role.key} label={role.label} checked={value.roleKeys.includes(role.key)} disabled={disabled || (!value.roleKeys.includes(role.key) && value.roleKeys.length >= 10)}
      onPress={() => patch({ roleKeys: value.roleKeys.includes(role.key) ? value.roleKeys.filter(key => key !== role.key) : [...value.roleKeys, role.key] })} />)}
    {showErrors && (value.roleKeys.length === 0 || value.roleKeys.length > 10) ? <FormHint error>{f.roleError}</FormHint> : null}</Card>
    <Card><Heading>{t.availability}</Heading><Copy small>{f.inTimezone(timezone)}</Copy><Toggle label={t.wholeEvent} value={value.wholeEvent} disabled={disabled} onChange={wholeEvent => patch({ wholeEvent })} />
      {!value.wholeEvent ? <><Copy small>{f.windowsHint}</Copy>{value.windows.map((window, index) => <View key={index} style={s.stack}><Heading>{f.window(index + 1)}</Heading>
        <LocalDateTimeField label={t.start} value={window.start} timezone={timezone} disabled={disabled} error={(showErrors || !!window.start) && !isValidLocalDateTime(window.start) ? f.dateRequired : undefined}
          onChange={start => patch({ windows: value.windows.map((item, i) => i === index ? { ...item, start } : item) })} />
        <LocalDateTimeField label={t.end} value={window.end} timezone={timezone} disabled={disabled}
          error={(showErrors || !!window.end) && !isValidLocalDateTime(window.end) ? f.dateRequired : isValidLocalDateTime(window.start) && isValidLocalDateTime(window.end) && window.end <= window.start ? f.endAfterStart : undefined}
          onChange={end => patch({ windows: value.windows.map((item, i) => i === index ? { ...item, end } : item) })} />
        <Button label={t.removeWindow} variant="secondary" disabled={disabled} onPress={() => patch({ windows: value.windows.filter((_, i) => i !== index) })} /></View>)}
        {showErrors && value.windows.length === 0 ? <FormHint error>{f.windowsError}</FormHint> : null}
        {value.windows.length >= 12 ? <FormHint error={value.windows.length > 12}>{f.windowLimit}</FormHint> : null}
        <Button label={t.addWindow} variant="secondary" disabled={disabled || value.windows.length >= 12} onPress={() => patch({ windows: [...value.windows, { start: '', end: '' }] })} /></> : null}</Card></>;
}
