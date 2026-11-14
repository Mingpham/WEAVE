import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { ManualDecision, type ManualCheckView } from '../src/features/incidents/decision-tools-screen';
import { decisionEn as copy } from '../src/strings/en';

vi.mock('react-native', () => ({View: 'View'}));
vi.mock('@/theme', () => ({styles: {}}));
vi.mock('@/components/ui', async () => {
  const {createElement} = await import('react');
  return Object.fromEntries(['Button', 'Card', 'Choice', 'Copy', 'Field', 'Heading', 'Notice', 'PageTitle'].map(name =>
    [name, (props: Record<string, unknown>) => createElement(name, props)]));
});
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
let renderer: ReactTestRenderer;
const allowed: ManualCheckView = {canApply: true, checks: [{key: 'ready', message: 'Ready', failed: false, uncertain: false}]};
function button(label: string) {return renderer.root.findAll(node => String(node.type) === 'Button' && node.props.label === label)[0]!;}
afterEach(async () => {if (renderer) await act(async () => renderer.unmount());});

it.each(['NETWORK_ERROR', 'PROPOSAL_STALE'])('FR-REC-09 / UX-02 invalidates an allowed decision during recheck and after %s', async code => {
  let rejectRecheck!: (reason: {code: string}) => void;
  let checks = 0;
  const onCheck = () => ++checks === 1 ? Promise.resolve(allowed) : new Promise<ManualCheckView>((_, reject) => {rejectRecheck = reject;});
  const onApply = vi.fn(() => Promise.resolve());
  await act(async () => {renderer = create(<ManualDecision versionKey="revision-1" kinds={[{key: 'operation', label: 'Operation', fields: []}]}
    maxActions={3} onCheck={onCheck} onApply={onApply} />);});
  await act(async () => {button(copy.addAction).props.onPress();});
  await act(async () => {button(copy.check).props.onPress();});
  expect(button(copy.apply).props.disabled).toBe(false);
  // Enter the confirmation first: its Apply button must also be gated.
  await act(async () => {button(copy.apply).props.onPress();});
  await act(async () => {button(copy.check).props.onPress();});
  expect(button(copy.apply).props.disabled).toBe(true);
  await act(async () => {rejectRecheck({code});});
  expect(button(copy.apply).props.disabled).toBe(true);
  expect(onApply).not.toHaveBeenCalled();
});
