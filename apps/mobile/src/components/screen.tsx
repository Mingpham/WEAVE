import type { PropsWithChildren, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { en } from '@/strings/en';
import { errorMessage } from '@/strings/errors';
import { colors, styles as s } from '@/theme';
import { Button, Card, Copy, Heading, Notice } from './ui';

// UI state only. API hooks map their query result into this boundary.
export type ScreenState = { phase: 'ready' | 'loading' | 'empty' | 'error'; offline?: boolean; lastUpdatedLabel?: string; errorCode?: string; refresh: () => void; refreshing?: boolean };
export function Screen({ children, state, demo = false, footer, topInset = false, emptyTitle = en.empty, emptyCopy = en.emptyCopy }: PropsWithChildren<{
  state?: ScreenState; demo?: boolean; footer?: ReactNode; topInset?: boolean; emptyTitle?: string; emptyCopy?: string;
}>) {
  return <SafeAreaView style={s.fill} edges={topInset ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}><KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    {demo && <View style={s.footer}><Text style={s.badgeText}>{en.demo}</Text><Copy small>{en.demoCopy}</Copy></View>}
    {state?.offline && <View style={s.footer}><Copy>{state.lastUpdatedLabel ? `${en.offline} ${state.lastUpdatedLabel}.` : en.noUpdate}</Copy></View>}
    <ScrollView keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={s.content}
      refreshControl={state ? <RefreshControl enabled={!state.offline} refreshing={state.refreshing ?? false} onRefresh={state.refresh} tintColor={colors.forest} /> : undefined}>
      {state?.phase === 'loading' ? <View accessibilityLabel={en.loading} accessibilityState={{ busy: true }} style={s.stack}>
        <Heading>{en.loading}</Heading><View style={s.skeleton} /><View style={s.skeleton} /><View style={s.skeleton} />
      </View> : state?.phase === 'error' ? <Card><Heading>{en.error}</Heading><Notice danger>{errorMessage(state.errorCode)}</Notice><Button label={en.retry} onPress={state.refresh} disabled={state.offline} /></Card>
        : state?.phase === 'empty' ? <Card><Heading>{emptyTitle}</Heading><Copy>{emptyCopy}</Copy><Button label={en.refresh} onPress={state.refresh} disabled={state.offline} /></Card> : children}
    </ScrollView>{footer}
  </KeyboardAvoidingView></SafeAreaView>;
}
