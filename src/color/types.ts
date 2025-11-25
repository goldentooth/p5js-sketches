import type { As } from '../types';

/**
 * RGB color as [r, g, b] where each component is 0-255
 */
export type RGB = [number, number, number];

/**
 * RGBA color as [r, g, b, a] where each component is 0-255
 */
export type RGBA = [number, number, number, number];

/**
 * HSL color as [h, s, l] where h is 0-360, s and l are 0-100
 */
export type HSL = [number, number, number];

/**
 * HSLA color as [h, s, l, a] where h is 0-360, s and l are 0-100, a is 0-255
 */
export type HSLA = [number, number, number, number];

/**
 * Any color type
 */
export type Color = RGB | RGBA | HSL | HSLA;
