import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { Composer, type ComposerDraft, type LocalPhoto } from '../src/features/evidence/composer-screen';
import { en } from '../src/strings/en';

vi.mock('react-native', () => ({View: 'View', Image: 'Image'}));
vi.mock('@/theme', () => ({styles: {}}));
vi.mock('@/components/ui', async () => {
  const { createElement } = await import('react');
  return Object.fromEntries(['Badge', 'Button', 'Card', 'Choice', 'Copy', 'Field', 'Heading', 'Notice', 'PageTitle'].map(name =>
    [name, (props: Record<string, unknown>) => createElement(name, props)]));
});
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
let renderer: ReactTestRenderer;
const photo: LocalPhoto = {uri: 'file:///fixture-photo.jpg', width: 100, height: 100, bytes: 200};
function Harness({pick}: {pick: () => Promise<LocalPhoto | null>}) {
  const [draft, setDraft] = useState<ComposerDraft>({text: '', photos: []});
  return <Composer draft={draft} onChange={setDraft} contexts={[]} maxPhotos={3} onPickPhoto={pick}
    onSend={async () => {setDraft({text: '', photos: []});}} />;
}
function button(label: string) { return renderer.root.findAll(node => String(node.type) === 'Button' && node.props.label === label)[0]!; }
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); });

it('FR-EVD-03 photo preparation preserves text edited while the picker is pending', async () => {
  let resolvePhoto!: (photo: LocalPhoto) => void;
  await act(async () => { renderer = create(<Harness pick={() => new Promise(resolve => {resolvePhoto = resolve;})} />); });
  await act(async () => { button(en.addPhoto).props.onPress(); });
  await act(async () => { renderer.root.findAll(node => String(node.type) === 'Field')[0]!.props.onChangeText('Latest draft text'); });
  await act(async () => { resolvePhoto(photo); });
  expect(renderer.root.findAll(node => String(node.type) === 'Field')[0]!.props.value).toBe('Latest draft text');
  expect(button(en.send).props.disabled).toBe(false);
});

it('FR-EVD-01 / FR-EVD-03 allows a second photo-only draft after an acknowledged send', async () => {
  await act(async () => { renderer = create(<Harness pick={() => Promise.resolve(photo)} />); });
  await act(async () => { button(en.addPhoto).props.onPress(); });
  expect(button(en.send).props.disabled).toBe(false);
  await act(async () => { button(en.send).props.onPress(); });
  expect(button(en.send).props.disabled).toBe(true);
  await act(async () => { button(en.addPhoto).props.onPress(); });
  expect(button(en.send).props.disabled).toBe(false);
});
