declare module "picomatch" {
  type Matcher = (input: string) => boolean;
  interface Picomatch {
    (pattern: string | string[], options?: Record<string, unknown>): Matcher;
  }
  const picomatch: Picomatch;
  export default picomatch;
}
