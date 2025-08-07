import type { QwikIntrinsicElements } from '@builder.io/qwik';

export interface Options {
  reverse?: boolean;
  max?: number;
  startX?: number;
  startY?: number;
  perspective?: number;
  easing?: string;
  scale?: number;
  speed?: number;
  transition?: boolean;
  axis?: 'x' | 'y' | null;
  glare?: boolean;
  maxGlare?: number;
  glarePrerender?: boolean;
  fullPageListening?: boolean;
  mouseEventElement?: string | HTMLElement | null;
  reset?: boolean;
  resetToStart?: boolean;
  gyroscope?: boolean;
  gyroscopeMinAngleX?: number;
  gyroscopeMaxAngleX?: number;
  gyroscopeMinAngleY?: number;
  gyroscopeMaxAngleY?: number;
  gyroscopeSamples?: number;
}

export interface QwikParallaxTilt
  extends Omit<QwikIntrinsicElements['div'], 'onMouseEnter$' | 'onMouseLeave$' | 'onMouseMove$'> {
  options?: Options;
  onTiltChange$?: (values: {
    tiltX: number;
    tiltY: number;
    percentageX: number;
    percentageY: number;
    angle: number;
  }) => void;
}

export interface State {
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  left: number;
  top: number;
  gammazero: number | null;
  betazero: number | null;
  lastgammazero: number | null;
  lastbetazero: number | null;
  transitionTimeout: number | null;
  updateCall: number | null;
  currentEvent: MouseEvent | { clientX: number; clientY: number } | null;
  gyroscopeSamples: number;
  reverse: number;
  glareElement: HTMLDivElement | null;
  glareWrapper: HTMLDivElement | null;
}
