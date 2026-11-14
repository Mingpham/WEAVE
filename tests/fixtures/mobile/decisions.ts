import type { ManualActionKind, ManualCheckView } from '../../../apps/mobile/src/features/incidents/decision-tools-screen';

export const decisionFixtures = {
  maxActions: 3,
  types: [
    {key: 'MEMBER_UNAVAILABLE', label: 'A teammate is unavailable'}, {key: 'RESOURCE_UNAVAILABLE', label: 'A resource is unavailable'},
    {key: 'TASK_DELAY', label: 'A task is delayed'}, {key: 'HANDOFF_FAILURE', label: 'A handoff failed'},
    {key: 'CONFLICTING_INFO', label: 'Information conflicts'}, {key: 'PLAN_CHANGE', label: 'The plan needs to change'},
    {key: 'OTHER', label: 'Something else'},
  ],
  subjects: [{key: 'speaker', label: 'Portable speaker'}, {key: 'courtyard', label: 'Main courtyard'}],
  tasks: [{key: 'sound', label: 'Run the sound check'}, {key: 'welcome', label: 'Prepare the welcome desk'}],
  members: [{key: 'alex', label: 'Alex · On site'}, {key: 'river', label: 'River · Available'}],
  areas: [{key: 'courtyard', label: 'Main courtyard'}, {key: 'entrance', label: 'Main entrance'}],
  resources: [{key: 'speaker', label: 'Portable speaker'}, {key: 'backup', label: 'Backup speaker'}],
  context: 'The sound check is blocked. Ask for a first-hand observation about the available equipment.',
  check: {canApply: true, checks: [
    {key: 'permissions', message: 'Preview: the organizer can apply this decision.', failed: false, uncertain: false},
    {key: 'availability', message: 'Preview: equipment availability needs a field check.', failed: false, uncertain: true},
  ]} satisfies ManualCheckView,
};
const task = {key: 'taskKey', label: 'Task', choices: decisionFixtures.tasks, required: true};
const member = {key: 'memberKey', label: 'Teammate', choices: decisionFixtures.members, required: true};
export const decisionKinds: ManualActionKind[] = [
  {key: 'reassign', label: 'Invite another teammate', fields: [task, member]},
  {key: 'swap', label: 'Use a different resource', fields: [
    {...task, required: false}, {key: 'areaKey', label: 'Area (choose a task or area)', choices: decisionFixtures.areas},
    {key: 'fromResourceKey', label: 'Replace resource (optional)', choices: decisionFixtures.resources},
    {key: 'toResourceKey', label: 'Use resource', choices: decisionFixtures.resources, required: true}, {...member, required: false},
  ]},
  {key: 'reschedule', label: 'Move a task to a new time', fields: [task,
    {key: 'startsAt', label: 'New start · ISO date and timezone (optional)'}, {key: 'dueAt', label: 'New deadline · ISO date and timezone', required: true}]},
  {key: 'defer', label: 'Defer a non-critical task', fields: [task]},
  {key: 'add', label: 'Add recovery work', fields: [
    {key: 'title', label: 'Task title', required: true}, {key: 'description', label: 'Instructions', required: true},
    {key: 'criteria', label: 'Completion criteria · one per line', required: true},
    {key: 'areaKey', label: 'Area', choices: decisionFixtures.areas, required: true},
    {key: 'dueAt', label: 'Deadline · ISO date and timezone', required: true}, member,
  ]},
];
