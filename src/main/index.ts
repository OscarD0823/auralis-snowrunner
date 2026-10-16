import { publishMain } from '@utilities/bridge/main/publisher'
import { registerDI } from '@utilities/di/main/registration'
import { app } from 'electron'
import { join } from 'node:path'
import squirrelStartup from 'electron-squirrel-startup'

// Preserve the existing profile while the visible product name changes.
app.setPath('userData', join(app.getPath('appData'), 'SnowRunner Studio'))

if (squirrelStartup && !process.windowsStore) {
	app.quit()
} else {
	app.setAppUserModelId('com.squirrel.SnowRunnerStudio.SnowRunnerStudio')
	await registerDI()
	await publishMain()
	void runProgram()
}

/** Запустить программу. */
async function runProgram() {
	const { Program } = await import('./program')

	await new Program().init()
}
