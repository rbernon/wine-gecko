# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import os, shutil
import simplejson as json
import unittest
import hashlib
import base64
from cuddlefish import preflight
from io import StringIO

class Util(unittest.TestCase):
    def get_basedir(self):
        return os.path.join(".test_tmp", self.id())
    def make_basedir(self):
        basedir = self.get_basedir()
        if os.path.isdir(basedir):
            here = os.path.abspath(os.getcwd())
            assert os.path.abspath(basedir).startswith(here) # safety
            shutil.rmtree(basedir)
        os.makedirs(basedir)
        return basedir

    def test_base62(self):
        for i in range(1000):
            h = hashlib.sha1(str(i)).digest()
            s1 = base64.b64encode(h, "AB").strip("=")
            s2 = base64.b64encode(h).strip("=").replace("+","A").replace("/","B")
            self.assertEqual(s1, s2)

    def write(self, config):
        basedir = self.get_basedir()
        fn = os.path.join(basedir, "package.json")
        open(fn,"w").write(config)
    def read(self):
        basedir = self.get_basedir()
        fn = os.path.join(basedir, "package.json")
        return open(fn,"r").read()

    def get_cfg(self):
        cfg = json.loads(self.read())
        if "name" not in cfg:
            # the cfx parser always provides a name, even if package.json
            # doesn't contain one
            cfg["name"] = "pretend name"
        return cfg

    def parse(self, keydata):
        fields = {}
        fieldnames = []
        for line in keydata.split("\n"):
            if line.strip():
                k,v = line.split(":", 1)
                k = k.strip() ; v = v.strip()
                fields[k] = v
                fieldnames.append(k)
        return fields, fieldnames

    def test_preflight(self):
        basedir = self.make_basedir()
        fn = os.path.join(basedir, "package.json")

        # empty config is not ok: need id (name is automatically supplied)
        config_orig = "{}"
        self.write(config_orig)
        out = StringIO()
        cfg = self.get_cfg()
        config_was_ok, modified = preflight.preflight_config(cfg, fn,
                                                             stderr=out)
        self.assertEqual(config_was_ok, False)
        self.assertEqual(modified, True)
        backup_fn = os.path.join(basedir, "package.json.backup")
        config_backup = open(backup_fn,"r").read()
        self.assertEqual(config_backup, config_orig)
        config = json.loads(self.read())
        self.assertFalse("name" in config)
        self.assertTrue("id" in config)
        self.assertTrue(config["id"].startswith("jid1-"), config["id"])
        self.assertEqual(out.getvalue().strip(),
                             "No 'id' in package.json: creating a new ID for you.")
        os.unlink(backup_fn)

        # just a name? we add the id
        config_orig = '{"name": "my-awesome-package"}'
        self.write(config_orig)
        out = StringIO()
        cfg = self.get_cfg()
        config_was_ok, modified = preflight.preflight_config(cfg, fn,
                                                             stderr=out)
        self.assertEqual(config_was_ok, False)
        self.assertEqual(modified, True)
        backup_fn = os.path.join(basedir, "package.json.backup")
        config_backup = open(backup_fn,"r").read()
        self.assertEqual(config_backup, config_orig)
        config = json.loads(self.read())
        self.assertEqual(config["name"], "my-awesome-package")
        self.assertTrue("id" in config)
        self.assertTrue(config["id"].startswith("jid1-"), config["id"])
        jid = str(config["id"])
        self.assertEqual(out.getvalue().strip(),
                             "No 'id' in package.json: creating a new ID for you.")
        os.unlink(backup_fn)

        # name and valid id? great! ship it!
        config2 = '{"name": "my-awesome-package", "id": "%s"}' % jid
        self.write(config2)
        out = StringIO()
        cfg = self.get_cfg()
        config_was_ok, modified = preflight.preflight_config(cfg, fn,
                                                             stderr=out)
        self.assertEqual(config_was_ok, True)
        self.assertEqual(modified, False)
        config2a = self.read()
        self.assertEqual(config2a, config2)
        self.assertEqual(out.getvalue().strip(), "")

        # name and anonymous ID? without asking to see its papers, ship it
        config3 = '{"name": "my-old-skool-package", "id": "anonid0-deadbeef"}'
        self.write(config3)
        out = StringIO()
        cfg = self.get_cfg()
        config_was_ok, modified = preflight.preflight_config(cfg, fn,
                                                             stderr=out)
        self.assertEqual(config_was_ok, True)
        self.assertEqual(modified, False)
        config3a = self.read()
        self.assertEqual(config3a, config3)
        self.assertEqual(out.getvalue().strip(), "")

        # name and old-style ID? with nostalgic trepidation, ship it
        config4 = '{"name": "my-old-skool-package", "id": "foo@bar.baz"}'
        self.write(config4)
        out = StringIO()
        cfg = self.get_cfg()
        config_was_ok, modified = preflight.preflight_config(cfg, fn,
                                                             stderr=out)
        self.assertEqual(config_was_ok, True)
        self.assertEqual(modified, False)
        config4a = self.read()
        self.assertEqual(config4a, config4)
        self.assertEqual(out.getvalue().strip(), "")


if __name__ == '__main__':
    unittest.main()
