/**
 * A lazily-loaded provider. Calling it dynamically imports the implementation
 * module (and therefore its optional peer-dependency driver) on demand, so only
 * the drivers you actually use are ever required at runtime.
 */
export type LazyProvider<T> = () => Promise<T>;

/**
 * Resolves a provider from a `Record<key, LazyProvider<...>>` map and instantiates it,
 * e.g. `resolveProvider(mailProviders, process.env.MAIL_DRIVER as MailProviderKeys)`.
 */
// biome-ignore lint/suspicious/noExplicitAny: constructor signature varies per provider group
export async function resolveProvider<K extends string, T extends new (...args: any[]) => unknown>(
	providers: Record<K, LazyProvider<T>>,
	key: K,
	...args: ConstructorParameters<T>
): Promise<InstanceType<T>> {
	const Provider = await providers[key]();
	return new Provider(...args) as InstanceType<T>;
}
