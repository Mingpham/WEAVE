import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { colors, styles as s } from '@/theme';
import { en } from '@/strings/en';

export function Copy({ children, small = false }: PropsWithChildren<{ small?: boolean }>) {
  return <Text style={small ? s.small : s.body}>{children}</Text>;
}
export function Heading({ children }: PropsWithChildren) { return <Text accessibilityRole="header" style={s.heading}>{children}</Text>; }
export function Card({ children, hero = false }: PropsWithChildren<{ hero?: boolean }>) {
  return <View className="w-full" style={hero ? s.hero : s.card}>{hero && <View pointerEvents="none" style={s.ornament} />}{children}</View>;
}
export function Badge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'neutral' | 'warning' | 'danger' }>) {
  return <View style={[s.badge, tone === 'warning' && s.warning, tone === 'danger' && s.danger]}><Text style={s.badgeText}>{children}</Text></View>;
}
export function Button({ label, onPress, disabled = false, pending = false, variant = 'primary', testID }: {
  label: string; onPress: () => void; disabled?: boolean; pending?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger'; testID?: string;
}) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled: disabled || pending, busy: pending }} disabled={disabled || pending} onPress={onPress}
    style={({ pressed }) => [s.button, variant === 'secondary' && s.buttonSecondary, variant === 'accent' && s.buttonAccent,
      variant === 'danger' && s.buttonDanger, (disabled || pending) && s.disabled, pressed && s.pressed]}>
    {pending && <ActivityIndicator color={variant === 'primary' ? colors.card : colors.forest} />}
    <Text style={[s.buttonLabel, variant !== 'primary' && { color: variant === 'danger' ? colors.danger : colors.forest }]}>{pending ? en.sending : label}</Text>
  </Pressable>;
}
export function Field({ label, value, onChangeText, placeholder, multiline = false, disabled = false, maxLength = 1000 }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; disabled?: boolean; maxLength?: number;
}) {
  return <View style={s.stack}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText}
    placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} editable={!disabled} maxLength={maxLength}
    style={[s.input, multiline && s.multiline]} /></View>;
}
export function Choice({ label, selected, onPress, children, disabled = false }: PropsWithChildren<{label: string; selected: boolean; onPress: () => void; disabled?: boolean}>) {
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} disabled={disabled}
    onPress={onPress} style={[s.choice, selected && s.selected, disabled && s.disabled]}>
    <Text style={s.body}>{selected ? '◉ ' : '○ '}{label}</Text>{children}
  </Pressable>;
}
export function Notice({ children, danger = false }: PropsWithChildren<{danger?: boolean}>) {
  return <View accessibilityLiveRegion="polite" style={[s.notice, danger && s.danger]}><Copy>{children}</Copy></View>;
}
export function PageTitle({ eyebrow, title, subtitle, trailing }: { eyebrow?: string; title: string; subtitle?: string; trailing?: ReactNode }) {
  return <View style={s.stack}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<View style={s.between}>
    <Text accessibilityRole="header" style={s.title}>{title}</Text>{trailing}</View>{subtitle && <Copy small>{subtitle}</Copy>}</View>;
}
export function Brand() { return <View style={s.row}><View style={s.brandMark}><Text style={s.brandGlyph}>{en.mark}</Text></View><Text style={s.brand}>{en.brand}</Text></View>; }
