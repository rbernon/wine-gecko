# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.



import os
import subprocess
import sys
from datetime import datetime


def buildid_header(output):
    buildid = os.environ.get('MOZ_BUILD_DATE')
    if buildid and len(buildid) != 14:
        print('Ignoring invalid MOZ_BUILD_DATE: %s' % buildid, file=sys.stderr)
        buildid = None
    if not buildid:
        buildid = datetime.now().strftime('%Y%m%d%H%M%S')
    output.write("#define MOZ_BUILDID %s\n" % buildid)


def get_program_output(*command):
    try:
        with open(os.devnull) as stderr:
            return subprocess.check_output(command, stderr=stderr)
    except:
        return ''


def get_hg_info(workdir):
    repo = get_program_output('hg', '-R', workdir, 'path', 'default')
    if repo:
        repo = repo.strip()
        if repo.startswith('ssh://'):
            repo = 'https://' + repo[6:]
        repo = repo.rstrip('/')

    changeset = get_program_output(
        'hg', '-R', workdir, 'parent', '--template={node}')

    return repo, changeset


def source_repo_header(output):
    # We allow the source repo and changeset to be specified via the
    # environment (see configure)
    import buildconfig
    repo = buildconfig.substs.get('MOZ_SOURCE_REPO')
    changeset = buildconfig.substs.get('MOZ_SOURCE_CHANGESET')
    source = ''

    if bool(repo) != bool(changeset):
        raise Exception('MOZ_SOURCE_REPO and MOZ_SOURCE_CHANGESET both must '
                        'be set (or not set).')

    if not repo:
        if os.path.exists(os.path.join(buildconfig.topsrcdir, '.hg')):
            repo, changeset = get_hg_info(buildconfig.topsrcdir)

    if changeset:
        output.write('#define MOZ_SOURCE_STAMP %s\n' % changeset)

    if repo and buildconfig.substs.get('MOZ_INCLUDE_SOURCE_INFO'):
        source = '%s/rev/%s' % (repo, changeset)
        output.write('#define MOZ_SOURCE_REPO %s\n' % repo)
        output.write('#define MOZ_SOURCE_URL %s\n' % source)


def main(args):
    if (len(args)):
        func = globals().get(args[0])
        if func:
            return func(sys.stdout, *args[1:])


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
