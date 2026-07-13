/**
 * A lazily-loaded provider. Calling it dynamically imports the implementation
 * module (and therefore its optional peer-dependency driver) on demand, so only
 * the drivers you actually use are ever required at runtime.
 */
export type LazyProvider<T> = () => Promise<T>;
