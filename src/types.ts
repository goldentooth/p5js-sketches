export declare abstract class As<Tag extends keyof never> {
  private static readonly $as$: unique symbol;
  private [As.$as$]: Record<Tag, true>;
}
