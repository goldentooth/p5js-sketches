export const AIControlled = 'AIControlled';

/**
 * AI behavior state for controlled entities
 */
export type AIState = 'idle' | 'hunting' | 'fleeing' | 'wandering';

/**
 * Tag component marking an entity as AI-controlled.
 * Entities with this component will be processed by the AISystem.
 */
export interface AIControlled {
  /** Current AI behavior state (optional, defaults to 'wandering') */
  state?: AIState;
}
