import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { basename, dirname, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'

type Target = { src: string; dest: string; rename?: string | { stripBase: boolean } }

/** Only copies the project's own files; the development server watches their directories. */
export function viteStaticCopy({ targets }: { targets: Target[] }): Plugin {
	let root: string
	let out: string
	async function copy() {
		const boundary = resolve(root, '.vite')
		for (const target of targets) {
			const source = resolve(root, target.src)
			const wildcard = source.endsWith(`${sep}*`)
			const sources = wildcard
				? (await readdir(dirname(source), { withFileTypes: true })).filter(entry => entry.isFile()).map(entry => resolve(dirname(source), entry.name))
				: [source]
			for (const file of sources) {
				const destination = resolve(out, target.dest, typeof target.rename === 'string' ? target.rename : basename(file))
				if (!destination.startsWith(boundary + sep)) throw new Error('Static assets must stay inside .vite')
				await mkdir(dirname(destination), { recursive: true })
				await copyFile(file, destination)
			}
		}
	}
	return {
		name: 'auralis-static-assets',
		configResolved(config) { root = config.root; out = resolve(root, config.build.outDir) },
		async closeBundle() { await copy() },
		async configureServer(server) {
			await copy()
			const watched = targets.map(target => resolve(root, target.src.replace(/[/\\]\*$/, '')))
			server.watcher.add(watched)
			server.watcher.on('all', (_event, file) => {
				if (watched.some(path => file === path || file.startsWith(path + sep))) {
					void copy().then(() => server.ws.send({ type: 'full-reload' })).catch(error => server.config.logger.error(String(error)))
				}
			})
		}
	}
}
