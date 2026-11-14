import { useLayoutEffect, useRef } from 'react';
import { Image, View } from 'react-native';
import { Badge, Button, Card, Choice, Copy, Field, Heading, Notice, PageTitle } from '@/components/ui';
import { planningEn as p } from '@/strings/en';
import { styles as s } from '@/theme';
import type { LocalPhoto } from '../evidence/composer-screen';
import { useAcknowledgedAction } from '../shared/use-acknowledged-action';
import type { PlanningChoice, ResourceReportDraft, ResourcesView } from './models';

export function ResourcesAreas({model, onEditResource, onEditArea, onAddResource, onAddArea, onReport, onSource}: {
  model: ResourcesView; onEditResource: (key: string) => void; onEditArea: (key: string) => void;
  onAddResource: () => void; onAddArea: () => void; onReport: (key: string) => void;
  onSource: (key: string) => void;
}) {
  return <><PageTitle eyebrow={p.resources} title={p.resourcesTitle} subtitle={p.resourcesCopy} />
    <Notice>{p.statusEvidence}</Notice>
    {model.canEdit && <View style={s.row}><Button label={p.addResource} variant="secondary" onPress={onAddResource} /><Button label={p.addArea} variant="secondary" onPress={onAddArea} /></View>}
    {!model.groups.length && <Notice>{p.emptyAreas}</Notice>}
    {model.groups.map(group => <View key={group.key} style={s.stack}><View style={s.between}><Heading>{group.title}</Heading><Badge>{`${group.resources.length} ${p.resourceCount}`}</Badge></View>
      {!!group.notes && <Copy small>{group.notes}</Copy>}{!!group.key && <Button label={p.viewSource} variant="secondary" onPress={() => onSource(`item:${group.key}`)} />}{model.canEdit && !!group.key && <Button label={`${p.edit} · ${group.title}`} variant="secondary" onPress={() => onEditArea(group.key)} />}
      {!group.resources.length && <Copy>{p.emptyResources}</Copy>}
      {group.resources.map(resource => <Card key={resource.key}><View style={s.between}><Heading>{resource.title}</Heading><Badge tone={resource.unverified ? 'warning' : 'neutral'}>{resource.inventoryLabel}</Badge></View>
        <Copy small>{resource.category}</Copy><View style={s.row}><Badge>{resource.conditionLabel}</Badge><Badge>{resource.claimLabel}</Badge></View>
        <Copy small>{`${p.source} · ${resource.sourceLabel}`}</Copy><Button label={p.viewSource} variant="secondary" onPress={() => onSource(`resource:${resource.key}`)} /><Copy>{resource.custodian ?? p.custodianUnknown}</Copy>
        <Heading>{p.neededBy}</Heading>{resource.needs.length ? resource.needs.map((need, i) => <Copy key={i}>{need}</Copy>) : <Copy small>{p.noNeeds}</Copy>}
        <Button label={`${p.report} · ${resource.title}`} onPress={() => onReport(resource.key)} />
        {model.canEdit && <Button label={`${p.edit} · ${resource.title}`} variant="secondary" onPress={() => onEditResource(resource.key)} />}
      </Card>)}
    </View>)}
  </>;
}

export type ResourceReportProps = {
  resourceTitle: string; choices: PlanningChoice[]; areas: PlanningChoice[]; movedChoiceKey: string;
  draft: ResourceReportDraft; onChange: (draft: ResourceReportDraft) => void; onSend: (draft: ResourceReportDraft) => Promise<void>;
  onPickPhoto?: (camera: boolean) => Promise<LocalPhoto | null>; maxPhotos: number; offline?: boolean; demo?: boolean;
};
export function ResourceReport({resourceTitle, choices, areas, movedChoiceKey, draft, onChange, onSend, onPickPhoto, maxPhotos, offline, demo}: ResourceReportProps) {
  const action = useAcknowledgedAction();
  const media = useAcknowledgedAction();
  const latest = useRef(draft);
  useLayoutEffect(() => { latest.current = draft; }, [draft]);
  const patch = (next: Partial<ResourceReportDraft>) => { action.reset(); onChange({...latest.current, ...next}); };
  const pick = (camera: boolean) => void media.run(async () => {
    const photo = await onPickPhoto?.(camera);
    if (photo) patch({photos: [...latest.current.photos, photo].slice(0, maxPhotos)});
  });
  const valid = choices.some(choice => choice.key === draft.choiceKey) && (draft.choiceKey !== movedChoiceKey || areas.some(area => area.key === draft.areaKey));
  return <><PageTitle eyebrow={p.report} title={p.reportTitle} subtitle={p.reportCopy} /><Card><Heading>{resourceTitle}</Heading><Badge>{p.reported}</Badge></Card>
    {offline && <Notice>{p.offline}</Notice>}<Heading>{p.reportChoice}</Heading>
    {choices.map(choice => <Choice key={choice.key} label={choice.label} selected={choice.key === draft.choiceKey} disabled={action.pending} onPress={() => patch({choiceKey: choice.key})} />)}
    {draft.choiceKey === movedChoiceKey && <Card><Heading>{p.movedArea}</Heading>{areas.map(area => <Choice key={area.key} label={area.label} selected={area.key === draft.areaKey} disabled={action.pending} onPress={() => patch({areaKey: area.key})} />)}{!areas.length && <Copy>{p.emptyAreas}</Copy>}</Card>}
    <Field label={p.reportNotes} value={draft.text} onChangeText={text => patch({text})} disabled={action.pending} multiline />
    <Card><Heading>{p.photos}</Heading><View style={s.row}>{draft.photos.map((photo, index) => <View key={photo.uri} style={s.stack}><Image accessibilityLabel={`${p.photos} ${index + 1}`} source={{uri: photo.uri}} style={s.photo} />
      <Button label={`${p.removePhoto} ${index + 1}`} variant="secondary" disabled={action.pending || media.pending} onPress={() => patch({photos: draft.photos.filter((_, i) => i !== index)})} /></View>)}</View>
      <Button label={p.addPhoto} variant="secondary" pending={media.pending} disabled={!onPickPhoto || action.pending || draft.photos.length >= maxPhotos} onPress={() => pick(false)} />
      <Button label={p.camera} variant="secondary" disabled={!onPickPhoto || action.pending || media.pending || draft.photos.length >= maxPhotos} onPress={() => pick(true)} />
      {!onPickPhoto && <Copy small>{p.photoUnavailable}</Copy>}{media.error && <Notice danger>{media.error}</Notice>}</Card>
    {action.error && <Notice danger>{action.error}</Notice>}{action.acknowledged && <Notice>{demo ? p.reportDemo : p.reportSent}</Notice>}
    <Button label={p.sendReport} pending={action.pending} disabled={!valid || offline || media.pending || action.acknowledged} onPress={() => void action.run(() => onSend(draft))} />
  </>;
}
