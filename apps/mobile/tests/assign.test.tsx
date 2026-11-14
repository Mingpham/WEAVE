import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { Assign, type AssignmentSuggestion, type OfferResultView } from '../src/features/work/assign';
import { workEn as copy } from '../src/strings/en';

vi.mock('react-native', () => ({View: 'View', Image: 'Image', Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text'}));
vi.mock('react-native-safe-area-context', () => ({SafeAreaView: 'SafeAreaView'}));
vi.mock('@/theme', () => ({styles: {}}));
vi.mock('@/components/ui', async () => {
  const {createElement} = await import('react');
  return Object.fromEntries(['Badge', 'Button', 'Card', 'Choice', 'Copy', 'Heading', 'Notice', 'PageTitle'].map(name =>
    [name, (props: Record<string, unknown>) => createElement(name, props)]));
});
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
let renderer: ReactTestRenderer;
afterEach(async () => {if (renderer) await act(async () => renderer.unmount());});

it('FR-TASK-04 partial offers retain failed choice and retry without resending successes', async () => {
  const batches: {taskKey: string; memberKey: string}[][] = [];
  const tasks: AssignmentSuggestion[] = [
    {key: 'first', title: 'First task', dueLabel: '', respondByLabel: '', suggestedMemberKey: 'one', members: [{key: 'one', name: 'First person', reason: ''}]},
    {key: 'second', title: 'Second task', dueLabel: '', respondByLabel: '', suggestedMemberKey: 'one', members: [
      {key: 'one', name: 'First person', reason: ''}, {key: 'two', name: 'Selected person', reason: ''}]},
  ];
  function Harness() {
    const [snapshot, setSnapshot] = useState<{version: string; tasks: AssignmentSuggestion[]; results: OfferResultView[]}>({version: '1', tasks, results: []});
    return <Assign versionKey={snapshot.version} tasks={snapshot.tasks} results={snapshot.results} onSend={async selections => {
      batches.push(selections);
      if (batches.length === 1) setSnapshot({version: '2', tasks: [tasks[1]!], results: [
        {taskKey: 'first', taskTitle: 'First task', memberKey: 'one', memberLabel: 'First person', sent: true},
        {taskKey: 'second', taskTitle: 'Second task', memberKey: 'two', memberLabel: 'Selected person', sent: false, errorMessage: 'Availability changed'},
      ]});
    }} />;
  }
  const button = (label: string) => renderer.root.findAll(node => String(node.type) === 'Button' && node.props.label === label)[0]!;
  await act(async () => {renderer = create(<Harness />);});
  await act(async () => {renderer.root.findAll(node => String(node.type) === 'Choice' && node.props.label === 'Selected person')[0]!.props.onPress();});
  await act(async () => {button(copy.sendOffers(2)).props.onPress();});
  expect(renderer.root.findAll(node => String(node.type) === 'Notice' && node.props.children === 'Availability changed')).toHaveLength(1);
  expect(renderer.root.findAll(node => String(node.type) === 'Choice' && node.props.label === 'Selected person')[0]!.props.selected).toBe(true);
  expect(button(copy.sendOffers(1)).props.disabled).toBe(false);
  await act(async () => {button(copy.sendOffers(1)).props.onPress();});
  expect(batches[1]).toEqual([{taskKey: 'second', memberKey: 'two'}]);
});
