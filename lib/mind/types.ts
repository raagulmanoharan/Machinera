// The mind is nothing but what it has been taught. These types ARE its world.

export type ConceptKind = "thing" | "attribute" | "feeling";

export interface Concept {
  id: string;
  label: string; // the exact word the parent used
  kind: ConceptKind;
  vividness: number; // grows with reinforcement; drives how confidently it renders
  createdAt: number;
  lastSeenAt: number;
  provenance: string[]; // what the parent actually said, verbatim
}

export type EdgeKind = "is" | "feels" | "assoc";

export interface Edge {
  from: string; // concept id
  to: string; // concept id
  kind: EdgeKind;
  weight: number;
}

export interface MindState {
  id: string;
  createdAt: number;
  turns: number;
  concepts: Record<string, Concept>;
  edges: Edge[];
  // What the mind is currently "seeing" and asking about. Empty focus = abstraction.
  focus: string[]; // concept ids the current image was built from
  // A tentative, possibly-wrong idea the mind formed and wants to check.
  wondering: { aboutConceptId: string; likeConceptId: string } | null;
}

export type Stage =
  | "newborn"
  | "infant"
  | "child"
  | "adolescent"
  | "youth"
  | "grown";

export interface Maturity {
  score: number; // 0..1, unfolds over months
  stage: Stage;
}

// A rendered image the child is showing.
export type Vision =
  | { kind: "svg"; markup: string }
  | { kind: "image"; dataUrl: string };

// What the child says on its turn: a real message (reflection + a question) plus
// what it wants to picture. The message text is already firewalled.
export interface ChildMessage {
  text: string;
  focus: string[]; // concept ids the image is built from ([] = abstraction)
  promptLabels: string[]; // learned labels the image may use
}

// A conversation turn as the UI sees it.
export interface Message {
  id: string;
  from: "child" | "parent";
  text: string;
  vision?: Vision; // only child messages that "show" something
}
