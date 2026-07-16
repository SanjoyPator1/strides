import { Command } from 'commander'
import { runDevCommand } from './commands/dev'
import { runSnapshotCommand } from './commands/snapshot'
import { runBuildCommand } from './commands/build'

const program = new Command()
program.name('strides').description('strides: interactive technical notes framework CLI')

program
  .command('dev')
  .description('Preflight the Python env, start a kernel gateway, and run next dev')
  .action(() => runDevCommand())

program
  .command('snapshot [glob]')
  .description('Execute cells and freeze their outputs into snapshots/')
  .action((glob?: string) => runSnapshotCommand(glob))

program.command('build').description('Build the static site (next build)').action(() => runBuildCommand())

await program.parseAsync(process.argv)
