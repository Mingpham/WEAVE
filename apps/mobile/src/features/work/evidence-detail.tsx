import { View } from 'react-native';
import { Badge, Button, Card, Copy, Heading, PageTitle } from '@/components/ui';
import { styles as s } from '@/theme';
import { workEn as w } from '@/strings/en';
import { PhotoGallery, SourceLink, type EvidencePhoto } from './common';

export type EvidenceView = {title: string; authorLabel: string; timeLabel: string; text: string; photos: EvidencePhoto[];
  claims: {key: string; text: string; label: string; ai: boolean; sourceLabel: string; onSource?: () => void; sourceUnavailableReason?: string; onRetrySource?: () => Promise<void>}[];
  related: {key: string; label: string; onOpen: () => void}[]};
export function EvidenceDetail({model, offline}: {model: EvidenceView; offline?: boolean}) {
  return <><PageTitle eyebrow={w.evidence} title={model.title} subtitle={`${model.authorLabel} · ${model.timeLabel}`} />
    <Card><Heading>{w.note}</Heading><Copy>{model.text}</Copy>{model.photos.length > 0 ? <><Heading>{w.photos}</Heading><PhotoGallery photos={model.photos} offline={offline} /></> : <Copy small>{w.noPhotos}</Copy>}</Card>
    <Heading>{w.claims}</Heading>{model.claims.length === 0 && <Copy small>{w.noClaims}</Copy>}
    {model.claims.map(claim => <Card key={claim.key}><View style={s.row}><Badge>{claim.label}</Badge>{claim.ai && <Badge>{w.aiCheck}</Badge>}</View>
      <Copy>{claim.text}</Copy><Copy small>{claim.sourceLabel}</Copy>
      <SourceLink onOpen={claim.onSource} unavailableReason={claim.sourceUnavailableReason} onRetry={claim.onRetrySource} offline={offline} /></Card>)}
    {model.related.length > 0 && <Heading>{w.related}</Heading>}{model.related.map(item => <Button key={item.key} label={item.label} onPress={item.onOpen} variant="secondary" />)}
  </>;
}
