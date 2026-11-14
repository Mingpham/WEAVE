import type { ReactNode } from 'react';
import { CloseReportScreen, InboxScreen, SettlementScreen, TimelineScreen, type CloseReportModel, type InboxModel, type SettlementModel, type TimelineModel } from '../../../apps/mobile/src/features/records/record-screens';

// Isolated visual fixture. No callbacks simulate successful application operations.
const readOnly = (): never => { throw new Error('Read-only screenshot fixture: this operation is unavailable.'); };
const eventTitle = 'Riverside community day';
export const timelineCaptureModel: TimelineModel = {
  eventTitle, dateLabel: '14 Nov 2026',
  filters: ['All activity', 'Tasks', 'Incidents', 'Decisions'].map((label, index) => ({ label, selected: index === 0, onSelect: readOnly })),
  entries: [
    { id: 'log-41', time: '16:42', actor: 'Linh · Organizer', kind: 'Task approved', title: 'A welcoming finish', detail: 'Welcome desk packed down. All four completion criteria were checked and approved.', source: 'event_log · LOG-041 / TASK-018', onOpen: readOnly },
    { id: 'log-40', time: '16:28', actor: 'Minh · Site lead', kind: 'Incident resolved', title: 'Power restored at the east stage', detail: 'The replacement cable passed a safety check. The sound team confirmed the stage is ready.', source: 'event_log · LOG-040 / INC-006', onOpen: readOnly },
    { id: 'log-39', time: '16:10', actor: 'Linh · Organizer', kind: 'Decision approved', title: 'One team, a better route', detail: 'Two volunteers moved to the riverside entrance to shorten the arrival queue.', source: 'event_log · LOG-039 / DEC-009', onOpen: readOnly },
    { id: 'log-38', time: '15:54', actor: 'An · Volunteer', kind: 'Evidence submitted', title: 'Recycling stations ready', detail: 'Three labelled stations are in place. Photo evidence is awaiting owner review.', source: 'event_log · LOG-038 / TASK-014', onOpen: readOnly },
  ], onLoadMore: readOnly,
};
export const closeReportCaptureModel: CloseReportModel = {
  eventTitle, status: 'CLOSED', closedAt: '14 Nov · 18:00', headline: 'A good day, made together.', source: 'Fixture of SQL report · SNAP-2026-1114',
  metrics: [{ label: 'Tasks approved', value: '18 / 20' }, { label: 'Criteria met', value: '94%' }, { label: 'Incidents resolved', value: '5 / 6' }],
  detailMetrics: [{ label: 'Tasks at close', value: '18 done · 2 cancelled' }, { label: 'Median acknowledgement', value: '3 min' }, { label: 'Median verified recovery', value: '12 min' }, { label: 'Probes answered / sent', value: '8 / 10' }, { label: 'Proposals approved / rejected', value: '4 / 1' }, { label: 'Manual interventions', value: '2' }],
  summary: [{ title: 'What worked well', body: 'The team cleared the arrival queue by moving two volunteers to the riverside entrance.', references: ['TASK-007', 'DEC-009'] }, { title: 'What to carry forward', body: 'A spare power cable helped restore the east stage quickly. Check backup equipment before the next event.', references: ['INC-006', 'TASK-011'] }],
  outstanding: ['INC-008 · Missing storage key remained open at close.'], onSettlement: readOnly,
};
export const settlementCaptureModel: SettlementModel = {
  eventTitle, totalLabel: 'APPROVED STIPENDS', total: '1,200,000 VND', pending: 'Pending · 700,000 VND', paid: 'Paid · 500,000 VND', source: 'payout_ledger · fixture snapshot 14 Nov, 18:00',
  entries: [{ id: 'pay-01', member: 'Minh', task: 'Stage setup and safety checks', approvedAt: '14 Nov · 16:32', amount: '400,000 VND', status: 'PENDING', onPaid: readOnly, onVoid: readOnly }, { id: 'pay-02', member: 'An', task: 'Welcome desk and arrival support', approvedAt: '14 Nov · 16:42', amount: '300,000 VND', status: 'PENDING', onPaid: readOnly, onVoid: readOnly }, { id: 'pay-03', member: 'Huy', task: 'Transport and equipment return', approvedAt: '14 Nov · 17:20', amount: '500,000 VND', status: 'PAID_OUTSIDE', onPaid: readOnly, onVoid: readOnly }], onExport: readOnly,
};
export const inboxCaptureModel: InboxModel = {
  unreadLabel: '2 UNREAD UPDATES', entries: [
    { id: 'ntf-01', title: 'Recycling stations need your review', body: 'An submitted three photos and completion notes. Review the evidence when you are ready.', eventTitle, time: '8 min ago', kind: 'Submission', unread: true, onOpen: readOnly, onMarkRead: readOnly },
    { id: 'ntf-02', title: 'A quick decision for the entrance', body: 'Minh proposed moving two volunteers to the riverside entrance. Your approval is needed.', eventTitle, time: '24 min ago', kind: 'Decision needed', unread: true, onOpen: readOnly, onMarkRead: readOnly },
    { id: 'ntf-03', title: 'The east stage is ready again', body: 'The site lead verified recovery after replacing the power cable.', eventTitle, time: '42 min ago', kind: 'Recovery confirmed', unread: false, onOpen: readOnly, onMarkRead: readOnly },
    { id: 'ntf-04', title: 'Your team is on site', body: 'All twelve confirmed volunteers have checked in for today.', eventTitle, time: '2 hours ago', kind: 'Team update', unread: false, onOpen: readOnly, onMarkRead: readOnly },
  ],
};
export const recordCaptureScenes: { id: string; name: string; render: () => ReactNode }[] = [
  { id: '17', name: 'Timeline', render: () => <TimelineScreen model={timelineCaptureModel} /> },
  { id: '19', name: 'Close & Report', render: () => <CloseReportScreen model={closeReportCaptureModel} /> },
  { id: '20', name: 'Settlement', render: () => <SettlementScreen model={settlementCaptureModel} /> },
  { id: '26', name: 'Inbox', render: () => <InboxScreen model={inboxCaptureModel} /> },
];
