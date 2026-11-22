import json
import os
import shlex
import sys
import click
from .core.project import DEFAULT_GATEWAY, atomic_write, read_document, remote_read
from .utils.studio_backend import export_document, invoke_backend


def emit(ctx, value):
    if ctx.find_root().obj.get('json'):
        click.echo(json.dumps(value, ensure_ascii=False))
    else:
        for key, item in value.items():
            click.echo(f'{key}: {json.dumps(item, ensure_ascii=False) if isinstance(item, (dict, list)) else item}')


@click.group(invoke_without_command=True)
@click.option('--json', 'json_mode', is_flag=True, help='Machine-readable results and errors.')
@click.version_option('1.0.0')
@click.pass_context
def cli(ctx, json_mode):
    """Inspect and export Writing Studio documents using its real document engine."""
    ctx.ensure_object(dict)
    ctx.obj['json'] = json_mode
    if ctx.invoked_subcommand is None:
        ctx.invoke(repl)


@cli.group()
def project():
    """Inspect local documents and read the authenticated account's projects."""


@project.command('inspect')
@click.option('--input', 'filename', required=True, type=click.Path(exists=True, dir_okay=False))
@click.pass_context
def inspect(ctx, filename):
    """Return structure and IDs without printing manuscript prose."""
    emit(ctx, invoke_backend({'command': 'inspect', 'document': read_document(filename)}))


@project.command('list')
@click.option('--gateway', default=DEFAULT_GATEWAY, show_default=True)
@click.pass_context
def list_projects(ctx, gateway):
    """Read projects using STUDIO_SESSION_TOKEN; never bypass authentication."""
    emit(ctx, remote_read(gateway, 'projects'))


@project.command('pull')
@click.option('--gateway', default=DEFAULT_GATEWAY, show_default=True)
@click.option('--work', required=True, help='Exact account-visible work ID; no default work.')
@click.option('--output', required=True, type=click.Path(dir_okay=False))
@click.option('--overwrite', is_flag=True)
@click.pass_context
def pull(ctx, gateway, work, output, overwrite):
    """Save the authenticated work's current document as a private local file."""
    value = remote_read(gateway, 'manuscript', work)
    if 'doc' not in value:
        raise ValueError('Gateway response has no manuscript.')
    checked = invoke_backend({'command': 'inspect', 'document': value['doc']})
    filename = atomic_write(output, json.dumps(value, ensure_ascii=False, indent=2).encode('utf-8'), overwrite)
    emit(ctx, {'ok': True, 'output': filename, 'revision': value.get('revision'), 'kind': checked['kind']})


@cli.group('export')
def exports():
    """Export verified PDF/DOCX files or a complete delivery ZIP."""


def export_options(function):
    for option in reversed([
        click.option('--input', 'filename', required=True, type=click.Path(exists=True, dir_okay=False)),
        click.option('--output', required=True, type=click.Path(dir_okay=False)),
        click.option('--scope', default='all', help='all, scene:ID, unit:ID or part:ID'),
        click.option('--split-episodes', is_flag=True, help='One PDF/DOCX pair per series episode.'),
        click.option('--illustrations-dir', type=click.Path(exists=True, file_okay=False)),
        click.option('--overwrite', is_flag=True),
    ]):
        function = option(function)
    return function


@exports.command('package')
@export_options
@click.pass_context
def package(ctx, filename, output, scope, split_episodes, illustrations_dir, overwrite):
    """Build a delivery ZIP using the same backend as the website."""
    emit(ctx, export_document(read_document(filename), output, scope, split_episodes, 'package', overwrite, illustrations_dir))


@exports.command('document')
@export_options
@click.option('--format', 'kind', type=click.Choice(['pdf', 'docx']), required=True)
@click.pass_context
def document(ctx, filename, output, scope, split_episodes, illustrations_dir, overwrite, kind):
    """Export a single PDF or DOCX; use package for episode batches."""
    if split_episodes:
        raise ValueError('Use export package for episode batches.')
    emit(ctx, export_document(read_document(filename), output, scope, False, kind, overwrite, illustrations_dir))


@cli.command()
@click.pass_context
def repl(ctx):
    """Run memory-only interactive commands; quit exits. No shell evaluation."""
    if not sys.stdin.isatty():
        click.echo(cli.get_help(ctx))
        return
    from .utils.repl_skin import ReplSkin
    skin = ReplSkin('writing-studio', version='1.0.0', history_file=os.devnull)
    skin.info('Writing Studio 1.0.0 — type help or quit')
    while True:
        try:
            line = input(skin.prompt()).strip()
            if line in ('quit', 'exit'):
                break
            if not line:
                continue
            if line == 'help':
                click.echo(cli.get_help(ctx))
                continue
            cli.main(args=(['--json'] if ctx.obj['json'] else []) + shlex.split(line), standalone_mode=False)
        except (EOFError, KeyboardInterrupt):
            break
        except (ValueError, OSError, click.ClickException) as error:
            skin.error(str(error))
    skin.print_goodbye()


def main():
    try:
        cli.main(standalone_mode=False)
    except (ValueError, OSError, click.ClickException) as error:
        if '--json' in sys.argv:
            click.echo(json.dumps({'ok': False, 'error': str(error)}, ensure_ascii=False))
        else:
            click.echo('Error: ' + str(error), err=True)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
