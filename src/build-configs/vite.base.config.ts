import { builtinModules } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin, UserConfig } from 'vite'
import ts from 'typescript'

/** Папка, в которой находится текущий исполняемый скрипт. */
const _dirname = dirname(fileURLToPath(import.meta.url))

/** Модули, которые пакуются вместе с приложением. */
export const external = [
	'electron',
	...builtinModules.flatMap(module => [module, `node:${module}`])
]

/** Алиасы путей. */
export const alias = {
	'@src': join(_dirname, '../'),
	'@modules': join(_dirname, '../modules'),
	'@renderer': join(_dirname, '../renderer'),
	'@utilities': join(_dirname, '../utilities'),
	'@bridge': join(_dirname, '../utilities/bridge'),
	'@localization': join(_dirname, '../utilities/localization')
}

export function externalizePlugin(options): Plugin {
	return {
		name: 'externalize-plugin',
		enforce: 'pre',
		resolveId(id) {
			return options.filter.test(id.replaceAll('\\', '/'))
				? { id, external: true }
				: null
		}
	}
}

export function getBuildConfig(env: any): UserConfig {
	const { root, mode, command } = env

	return {
		root,
		mode,
		build: {
			emptyOutDir: false,
			outDir: join(_dirname, '../../.vite/build'),
			watch: command === 'serve'
				? {}
				: null,
			minify: ['package', 'build'].includes(command)
		},
		resolve: { alias },
		plugins: [transpileTypeScript()],
		clearScreen: false
	}
}

// The native runtime does not yet parse standard decorators. Keep their
// TypeScript semantics instead of shipping untransformed @inject syntax.
export function transpileTypeScript(): Plugin {
	return {
		name: 'auralis-typescript-decorators',
		enforce: 'pre',
		transform(code, id) {
			if (!id.endsWith('.ts') || !id.replaceAll('\\', '/').includes('/src/') || id.includes('node_modules')) return
			const result = ts.transpileModule(code, {
				fileName: id,
				compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, importHelpers: true, sourceMap: true, useDefineForClassFields: true }
			})
			return { code: result.outputText, map: result.sourceMapText ? JSON.parse(result.sourceMapText) : null }
		}
	}
}

export function getDefineKeys(names: string[]): { [name: string]: VitePluginRuntimeKeys } {
	const define: { [name: string]: VitePluginRuntimeKeys } = {}

	return names.reduce((acc, name) => {
		const NAME = name.toUpperCase()
		const keys: VitePluginRuntimeKeys = {
			VITE_DEV_SERVER_URL: `${NAME}_VITE_DEV_SERVER_URL`,
			VITE_NAME: `${NAME}_VITE_NAME`
		}

		return { ...acc, [name]: keys }
	}, define)
}

export function getBuildDefine(env: any): Record<string, any> {
	const { command, forgeConfig } = env
	const names = forgeConfig.renderer
		.filter(({ name }) => name !== null)
		.map(({ name }) => name)

	return Object.entries(getDefineKeys(names))
		.reduce((acc, [name, keys]) => {
			const { VITE_DEV_SERVER_URL, VITE_NAME } = keys

			return {
				...acc,
				[VITE_DEV_SERVER_URL]: command === 'serve'
					? JSON.stringify(process.env[VITE_DEV_SERVER_URL])
					: undefined,
				[VITE_NAME]: JSON.stringify(name)
			}
		}, {})
}

export function pluginExposeRenderer(name: string): Plugin {
	const { VITE_DEV_SERVER_URL } = getDefineKeys([name])[name]

	return {
		name: '@electron-forge/plugin-vite:expose-renderer',
		configureServer(server) {
			process.viteDevServers ??= {}
			process.viteDevServers[name] = server

			server.httpServer?.once('listening', () => {
				const addressInfo = server.httpServer?.address()

				process.env[VITE_DEV_SERVER_URL] = `http://localhost:${addressInfo?.['port']}`
			})
		}
	}
}

export function pluginHotRestart(command: 'reload' | 'restart'): Plugin {
	return {
		name: '@electron-forge/plugin-vite:hot-restart',
		apply: 'serve',
		closeBundle() {
			if (command === 'reload') {
				for (const server of Object.values(process.viteDevServers ?? {})) {
					server.hot.send({ type: 'full-reload' })
				}
			} else {
				process.stdin.emit('data', 'rs')
			}
		}
	}
}
