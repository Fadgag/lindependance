declare module 'bcryptjs' {
  export function hash(s: string, saltOrRounds: number | string): Promise<string>;
  export function compare(s: string, hash: string): Promise<boolean>;
  const bcrypt: { hash: typeof hash; compare: typeof compare };
  export default bcrypt;
}

