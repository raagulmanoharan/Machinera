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

export type Stage = "newborn" | "infant" | "child" | "growing" | "grown";

export interface Maturity {
  score: number; // 0..1, deliberately slow
  stage: Stage;
}

// What the parent offers on a turn. Either field may be blank.
export interface Teaching {
  literal: string; // "what it is"
  emotional: string; // "what it feels like"
}

// A rendered image the child is showing.
export type Vision =
  | { kind: "svg"; markup: string }
  | { kind: "image"; dataUrl: string };

// The full state of a single turn handed to the client.
export interface TurnView {
  vision: Vision;
  // The child's utterance, already vetted by the firewall. Tokens, not prose.
  utterance: string[];
  maturity: Maturity;
  focusLabels: string[]; // labels of concepts in focus (may be empty at turn zero)
}
