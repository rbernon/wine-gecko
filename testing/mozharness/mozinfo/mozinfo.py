#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

# TODO: it might be a good idea of adding a system name (e.g. 'Ubuntu' for
# linux) to the information; I certainly wouldn't want anyone parsing this
# information and having behaviour depend on it

import json
import os
import platform
import re
import sys

import mozfile

# keep a copy of the os module since updating globals overrides this
_os = os

class unknown(object):
    """marker class for unknown information"""
    def __bool__(self):
        return False
    def __str__(self):
        return 'UNKNOWN'
unknown = unknown() # singleton

# get system information
info = {'os': unknown,
        'processor': unknown,
        'version': unknown,
        'bits': unknown }
(system, node, release, version, machine, processor) = platform.uname()
(bits, linkage) = platform.architecture()

# get os information and related data
if system in ["Microsoft", "Windows"]:
    info['os'] = 'win'
    # There is a Python bug on Windows to determine platform values
    # http://bugs.python.org/issue7860
    if "PROCESSOR_ARCHITEW6432" in os.environ:
        processor = os.environ.get("PROCESSOR_ARCHITEW6432", processor)
    else:
        processor = os.environ.get('PROCESSOR_ARCHITECTURE', processor)
    system = os.environ.get("OS", system).replace('_', ' ')
    service_pack = os.sys.getwindowsversion()[4]
    info['service_pack'] = service_pack
elif system == "Linux":
    if hasattr(platform, "linux_distribution"):
        (distro, version, codename) = platform.linux_distribution()
    else:
        (distro, version, codename) = platform.dist()
    version = "%s %s" % (distro, version)
    if not processor:
        processor = machine
    info['os'] = 'linux'
elif system in ['DragonFly', 'FreeBSD', 'NetBSD', 'OpenBSD']:
    info['os'] = 'bsd'
    version = sys.platform
elif system == "Darwin":
    (release, versioninfo, machine) = platform.mac_ver()
    version = "OS X %s" % release
    info['os'] = 'mac'
elif sys.platform in ('solaris', 'sunos5'):
    info['os'] = 'unix'
    version = sys.platform
info['version'] = version # os version

# processor type and bits
if processor in ["i386", "i686"]:
    if bits == "32bit":
        processor = "x86"
    elif bits == "64bit":
        processor = "x86_64"
elif processor.upper() == "AMD64":
    bits = "64bit"
    processor = "x86_64"
elif processor == "Power Macintosh":
    processor = "ppc"
bits = re.search('(\d+)bit', bits).group(1)
info.update({'processor': processor,
             'bits': int(bits),
            })

# standard value of choices, for easy inspection
choices = {'os': ['linux', 'bsd', 'win', 'mac', 'unix'],
           'bits': [32, 64],
           'processor': ['x86', 'x86_64', 'ppc']}


def sanitize(info):
    """Do some sanitization of input values, primarily
    to handle universal Mac builds."""
    if "processor" in info and info["processor"] == "universal-x86-x86_64":
        # If we're running on OS X 10.6 or newer, assume 64-bit
        if release[:4] >= "10.6": # Note this is a string comparison
            info["processor"] = "x86_64"
            info["bits"] = 64
        else:
            info["processor"] = "x86"
            info["bits"] = 32

# method for updating information
def update(new_info):
    """
    Update the info.

    :param new_info: Either a dict containing the new info or a path/url
                     to a json file containing the new info.
    """

    if isinstance(new_info, str):
        f = mozfile.load(new_info)
        new_info = json.loads(f.read())
        f.close()

    info.update(new_info)
    sanitize(info)
    globals().update(info)

    # convenience data for os access
    for os_name in choices['os']:
        globals()['is' + os_name.title()] = info['os'] == os_name
    # unix is special
    if isLinux or isBsd:
        globals()['isUnix'] = True

def find_and_update_from_json(*dirs):
    """
    Find a mozinfo.json file, load it, and update the info with the
    contents.

    :param dirs: Directories in which to look for the file. They will be
                 searched after first looking in the root of the objdir
                 if the current script is being run from a Mozilla objdir.

    Returns the full path to mozinfo.json if it was found, or None otherwise.
    """
    # First, see if we're in an objdir
    try:
        from mozbuild.base import MozbuildObject
        build = MozbuildObject.from_environment()
        json_path = _os.path.join(build.topobjdir, "mozinfo.json")
        if _os.path.isfile(json_path):
            update(json_path)
            return json_path
    except ImportError:
        pass

    for d in dirs:
        d = _os.path.abspath(d)
        json_path = _os.path.join(d, "mozinfo.json")
        if _os.path.isfile(json_path):
            update(json_path)
            return json_path

    return None

update({})

# exports
__all__ = list(info.keys())
__all__ += ['is' + os_name.title() for os_name in choices['os']]
__all__ += [
    'info',
    'unknown',
    'main',
    'choices',
    'update',
    'find_and_update_from_json',
    ]

def main(args=None):

    # parse the command line
    from optparse import OptionParser
    parser = OptionParser(description=__doc__)
    for key in choices:
        parser.add_option('--%s' % key, dest=key,
                          action='store_true', default=False,
                          help="display choices for %s" % key)
    options, args = parser.parse_args()

    # args are JSON blobs to override info
    if args:
        for arg in args:
            if _os.path.exists(arg):
                string = file(arg).read()
            else:
                string = arg
            update(json.loads(string))

    # print out choices if requested
    flag = False
    for key, value in list(options.__dict__.items()):
        if value is True:
            print('%s choices: %s' % (key, ' '.join([str(choice)
                                                     for choice in choices[key]])))
            flag = True
    if flag: return

    # otherwise, print out all info
    for key, value in list(info.items()):
        print('%s: %s' % (key, value))

if __name__ == '__main__':
    main()
