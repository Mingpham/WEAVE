import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onboardingFormEn as t } from '@/strings/en';
import { colors, radius, size, space, styles as s } from '@/theme';
import { Button, Copy, Heading } from './ui';

// This control edits a local wall-clock value. It never assigns an offset or converts zones.
export function isValidLocalDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(`${value}:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 16) === value;
}
export function isValidTimeZone(value: string) {
  if (!value || value.length > 64 || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(value)) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; } catch { return false; }
}
const pad = (value: number) => String(value).padStart(2, '0');
function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return `${Number(day)} ${t.months[Number(month) - 1]} ${year}`;
}
export function LocalDateTimeField({ label, value, onChange, timezone, disabled = false, error }: {
  label: string; value: string; onChange: (value: string) => void; timezone: string; disabled?: boolean; error?: string;
}) {
  const [open, setOpen] = useState(false);
  const valid = isValidLocalDateTime(value);
  const zoneValid = isValidTimeZone(timezone);
  const display = valid ? `${dateLabel(value.slice(0, 10))} · ${value.slice(11)}` : t.chooseDateTime;
  return <View style={s.stack}><Text style={s.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${display}`} accessibilityState={{ disabled: disabled || !zoneValid }}
      disabled={disabled || !zoneValid} onPress={() => setOpen(true)} style={({ pressed }) => [s.choice, error && local.invalidBorder, (disabled || !zoneValid) && s.disabled, pressed && s.pressed]}>
      <Text style={s.body}>{display}</Text><Copy small>{zoneValid ? t.inTimezone(timezone) : t.timezoneRequired}</Copy>
    </Pressable>{error ? <Text accessibilityLiveRegion="polite" style={[s.small, local.error]}>{error}</Text> : null}
    <Modal visible={open && !disabled && zoneValid} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
      {open && !disabled && zoneValid ? <DateTimePicker key={value} label={label} value={value} timezone={timezone} onCancel={() => setOpen(false)}
        onApply={next => { onChange(next); setOpen(false); }} /> : null}
    </Modal>
  </View>;
}

function DateTimePicker({ label, value, timezone, onCancel, onApply }: {
  label: string; value: string; timezone: string; onCancel: () => void; onApply: (value: string) => void;
}) {
  const valid = isValidLocalDateTime(value);
  // Today chooses only the visible calendar page, never a saved date or time.
  const today = new Date();
  const [page, setPage] = useState({ year: valid ? Number(value.slice(0, 4)) : today.getFullYear(), month: valid ? Number(value.slice(5, 7)) - 1 : today.getMonth() });
  const [date, setDate] = useState(valid ? value.slice(0, 10) : '');
  const [hour, setHour] = useState(valid ? value.slice(11, 13) : '');
  const [minute, setMinute] = useState(valid ? value.slice(14, 16) : '');
  const firstDay = new Date(`${String(page.year).padStart(4, '0')}-${pad(page.month + 1)}-01T00:00:00Z`).getUTCDay();
  const days = new Date(Date.UTC(page.year, page.month + 1, 0)).getUTCDate();
  const hourValid = /^\d{1,2}$/.test(hour) && Number(hour) <= 23;
  const minuteValid = /^\d{1,2}$/.test(minute) && Number(minute) <= 59;
  const result = `${date}T${pad(Number(hour))}:${pad(Number(minute))}`;
  const canApply = !!date && hourValid && minuteValid && isValidLocalDateTime(result);
  function changeMonth(delta: number) {
    const month = page.month + delta;
    setPage({ year: page.year + (month < 0 ? -1 : month > 11 ? 1 : 0), month: (month + 12) % 12 });
  }
  function timeControl(title: string, text: string, setText: (value: string) => void, max: number, placeholder: string) {
    const step = (delta: number) => setText(pad(text ? (Number(text) + delta + max + 1) % (max + 1) : 0));
    return <View style={[s.stack, local.timeColumn]}><Text style={s.label}>{title}</Text><View style={local.timeRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.decrease(title)} onPress={() => step(-1)} style={local.square}><Text style={s.heading}>{t.minus}</Text></Pressable>
      <TextInput accessibilityLabel={title} value={text} keyboardType="number-pad" inputMode="numeric" maxLength={2} placeholder={placeholder} placeholderTextColor={colors.muted}
        onChangeText={next => setText(next.replace(/\D/g, ''))} onBlur={() => { if (text) setText(pad(Number(text))); }} style={[s.input, local.timeInput]} />
      <Pressable accessibilityRole="button" accessibilityLabel={t.increase(title)} onPress={() => step(1)} style={local.square}><Text style={s.heading}>{t.plus}</Text></Pressable>
    </View></View>;
  }
  return <SafeAreaView style={s.fill}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={local.pickerContent}>
    <Heading>{label}</Heading><Copy small>{t.inTimezone(timezone)}</Copy><Copy>{t.chooseDay}</Copy>
    <View style={s.between}><Pressable accessibilityRole="button" accessibilityLabel={t.previousMonth} accessibilityState={{ disabled: page.year === 1 && page.month === 0 }}
      disabled={page.year === 1 && page.month === 0} onPress={() => changeMonth(-1)} style={local.square}><Text style={s.heading}>‹</Text></Pressable>
      <Text accessibilityRole="header" style={s.heading}>{`${t.months[page.month]} ${page.year}`}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t.nextMonth} accessibilityState={{ disabled: page.year === 9999 && page.month === 11 }}
        disabled={page.year === 9999 && page.month === 11} onPress={() => changeMonth(1)} style={local.square}><Text style={s.heading}>›</Text></Pressable></View>
    <ScrollView horizontal contentContainerStyle={local.calendarScroll} showsHorizontalScrollIndicator={false}><View style={local.calendar}>
      {t.weekdays.map((day, index) => <View key={`weekday-${index}`} style={local.day}><Text style={s.small}>{day}</Text></View>)}
      {Array.from({ length: firstDay }, (_, index) => <View key={`empty-${index}`} style={local.day} />)}
      {Array.from({ length: days }, (_, index) => {
        const candidate = `${String(page.year).padStart(4, '0')}-${pad(page.month + 1)}-${pad(index + 1)}`;
        const selected = candidate === date;
        return <Pressable key={candidate} accessibilityRole="button" accessibilityLabel={dateLabel(candidate)} accessibilityState={{ selected }} onPress={() => setDate(candidate)}
          style={({ pressed }) => [local.day, selected && s.selected, selected && local.selectedDay, pressed && s.pressed]}><Text style={[s.body, selected && local.selectedText]}>{index + 1}</Text></Pressable>;
      })}</View></ScrollView>
    <Text accessibilityLiveRegion="polite" style={s.small}>{date ? `${t.selectedDate} · ${dateLabel(date)}` : t.noDate}</Text>
    <Heading>{t.time}</Heading><View style={s.row}>{timeControl(t.hour, hour, setHour, 23, t.hourPlaceholder)}{timeControl(t.minute, minute, setMinute, 59, t.minutePlaceholder)}</View>
    <Text accessibilityLiveRegion="polite" style={[s.small, ((!!hour && !hourValid) || (!!minute && !minuteValid)) && local.error]}>
      {(hour && !hourValid) || (minute && !minuteValid) ? t.invalidTime : t.timeHint}</Text>
    <Button label={t.applyDateTime} disabled={!canApply} onPress={() => { if (canApply) onApply(result); }} /><Button label={t.cancel} variant="secondary" onPress={onCancel} />
  </ScrollView></SafeAreaView>;
}
const local = StyleSheet.create({
  pickerContent: { padding: space.lg, gap: space.lg, maxWidth: 680, width: '100%', alignSelf: 'center' },
  calendarScroll: { flexGrow: 1, justifyContent: 'center' }, calendar: { flexDirection: 'row', flexWrap: 'wrap', width: size.touch * 7 },
  day: { width: size.touch, height: size.touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  selectedDay: { borderWidth: 1, borderColor: colors.sea }, selectedText: { fontFamily: 'DMSansBold' },
  square: { width: size.touch, height: size.touch, backgroundColor: colors.quiet, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  timeColumn: { flexGrow: 1 }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  timeInput: { width: size.touch + space.lg, textAlign: 'center', paddingHorizontal: space.sm },
  error: { color: colors.danger }, invalidBorder: { borderColor: colors.danger },
});
