// Yikes.
const _TypeofKind = typeof (0 as any);
type TypeofKind = typeof _TypeofKind;

type TypeofMap = {
  string: string;
  number: number;
  bigint: bigint;
  boolean: boolean;
  symbol: symbol;
  undefined: undefined;
  object: object | null;
  function: (...args: any[]) => any;
};

export function invariant<T extends TypeofKind> (value: any, type: T, errorMessage?: string): TypeofMap[T] {
  if (typeof value !== type) {
    throw new Error(errorMessage ?? `Expected value of type ${type}, but received type ${typeof value}`);
  }

  return value;
}
