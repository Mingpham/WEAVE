import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Choice, Copy, Field } from '@/components/ui';
import { planningEn as p } from '@/strings/en';
import { styles as s } from '@/theme';
import type { PlanningChoice } from './models';

export function PlanningToggle({label, selected, disabled, onPress}: {label: string; selected: boolean; disabled?: boolean; onPress: () => void}) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked: selected, disabled: !!disabled}}
    disabled={disabled} onPress={onPress} style={[s.choice, selected && s.selected, disabled && s.disabled]}>
    <Text style={s.body}>{selected ? '☑ ' : '☐ '}{label}</Text>
  </Pressable>;
}

// Bound only the rendered choices; this never changes the selected form values.
export function PlanningSelections({items, selectedKeys, onChoose, disabled, label, multiple = false, details}: {
  items: PlanningChoice[]; selectedKeys: string[]; onChoose: (key: string) => void; disabled?: boolean; label: string;
  multiple?: boolean; details?: (key: string) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(12);
  const matching = items.filter(item => item.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const Control = multiple ? PlanningToggle : Choice;
  return <View style={s.stack}>
    {items.length > 8 && <Field label={`${p.search} · ${label}`} value={query} disabled={disabled} onChangeText={text => {setQuery(text); setVisible(12);}} />}
    {matching.slice(0, visible).map(item => <View key={item.key} style={s.stack}>
      <Control label={item.label} selected={selectedKeys.includes(item.key)} disabled={disabled} onPress={() => onChoose(item.key)} />
      {selectedKeys.includes(item.key) && details?.(item.key)}
    </View>)}
    {!!query && !matching.length && <Copy small>{p.noMatches}</Copy>}
    {!!query && <Button label={p.clearSearch} variant="secondary" disabled={disabled} onPress={() => {setQuery(''); setVisible(12);}} />}
    {matching.length > visible && <Button label={p.showMore} variant="secondary" disabled={disabled} onPress={() => setVisible(count => count + 12)} />}
  </View>;
}
