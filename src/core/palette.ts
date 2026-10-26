export type SymbolName =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'plus'
  | 'star'
  | 'hexagon'
  | 'ring'
  | 'cross'
  | 'bar';

export interface FlowColor {
  hex: string;
  /** Closest square emoji, for spoiler-free share text. */
  emoji: string;
  /** Shape drawn on the dot in colour-blind mode. */
  symbol: SymbolName;
  /** Symbol ink: dark on light colours, white otherwise. */
  ink: string;
}

/** Ordered so neighbouring indices differ in lightness as well as hue. */
export const PALETTE: FlowColor[] = [
  { hex: '#E5484D', emoji: '🟥', symbol: 'circle', ink: '#FFFFFF' },
  { hex: '#3B6EF5', emoji: '🟦', symbol: 'square', ink: '#FFFFFF' },
  { hex: '#F2B01E', emoji: '🟨', symbol: 'diamond', ink: '#4A3200' },
  { hex: '#1FA463', emoji: '🟩', symbol: 'triangle', ink: '#FFFFFF' },
  { hex: '#8B5CF6', emoji: '🟪', symbol: 'plus', ink: '#FFFFFF' },
  { hex: '#F27B35', emoji: '🟧', symbol: 'star', ink: '#FFFFFF' },
  { hex: '#14A3B8', emoji: '🟦', symbol: 'hexagon', ink: '#FFFFFF' },
  { hex: '#E556A8', emoji: '🟪', symbol: 'ring', ink: '#FFFFFF' },
  { hex: '#9A6B3F', emoji: '🟫', symbol: 'cross', ink: '#FFFFFF' },
  { hex: '#9CC43A', emoji: '🟩', symbol: 'bar', ink: '#2E3A0A' },
];

export function flowColor(i: number): FlowColor {
  return PALETTE[i % PALETTE.length];
}
