import type { LocalPhoto } from '../evidence/composer-screen';

// Presentation-only models. Contract adapters own IDs, enums, validation and API payloads.
export type PlanningChoice = { key: string; label: string };
export type PlanningItemKind = 'task' | 'resource' | 'area' | 'role';
export type PlanningCriterion = { text: string; critical: boolean; photo: boolean };
export type PlanningLink = { key: string; required: boolean };
export type PlanningForm = {
  name: string; description: string; areaKey: string; roleKey: string; roleRequired: boolean;
  start: string; due: string; duration: string; stipend: string; critical: boolean; hardDeadline: boolean;
  criteria: PlanningCriterion[]; dependencies: PlanningLink[]; needs: PlanningLink[];
  category: string; kindKey: string; quantity: string; inventoryKey: string; custodian: string;
};
export type PlanningItem = {
  key: string; kind: PlanningItemKind; title: string; detail: string; locked: boolean; ai: boolean;
  sourceLabel: string; form: PlanningForm;
};
export type PlanningMessage = { key: string; text: string; ai: boolean; sourceLabel: string; changes?: string[] };
export type PlanningQuestion = { key: string; text: string; why: string; answers: string[] };
export type PlanningView = {
  revision: string; items: PlanningItem[]; messages: PlanningMessage[]; questions: PlanningQuestion[];
  gaps: string[]; assumptions: string[]; composing: boolean; aiAvailable: boolean; aiFailed: boolean;
  canEdit: boolean; finalized: boolean; published: boolean;
  timeContext: string;
  timeline: { key: string; time: string; title: string; area: string }[];
};
export type PlanningEditorOptions = {
  areas: PlanningChoice[]; roles: PlanningChoice[]; tasks: PlanningChoice[]; resources: PlanningChoice[];
  inventory: PlanningChoice[]; resourceKinds: PlanningChoice[]; resourceCategories?: PlanningChoice[]; acquisitionKey?: string;
};
export type ResourceCardView = {
  key: string; title: string; category: string; inventoryLabel: string; unverified: boolean;
  conditionLabel: string; claimLabel: string; sourceLabel: string; custodian?: string; needs: string[];
};
export type ResourcesView = { canEdit: boolean; groups: { key: string; title: string; notes?: string; resources: ResourceCardView[] }[] };
export type ResourceReportDraft = { choiceKey: string; areaKey: string; text: string; photos: LocalPhoto[] };
