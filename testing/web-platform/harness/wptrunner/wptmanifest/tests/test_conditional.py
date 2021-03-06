# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

import unittest

from io import StringIO

from ..backends import conditional
from ..node import BinaryExpressionNode, BinaryOperatorNode, VariableNode, NumberNode


class TestConditional(unittest.TestCase):
    def parse(self, input_str):
        return self.parser.parse(StringIO(input_str))

    def compile(self, input_text):
        return conditional.compile(input_text)

    def test_get_0(self):
        data = """
key: value

[Heading 1]
  other_key:
    if a == 1: value_1
    if a == 2: value_2
    value_3
"""

        manifest = self.compile(data)

        self.assertEqual(manifest.get("key"), "value")
        children = list(item for item in manifest.iterchildren())
        self.assertEqual(len(children), 1)
        section = children[0]
        self.assertEqual(section.name, "Heading 1")

        self.assertEqual(section.get("other_key", {"a": 1}), "value_1")
        self.assertEqual(section.get("other_key", {"a": 2}), "value_2")
        self.assertEqual(section.get("other_key", {"a": 7}), "value_3")
        self.assertEqual(section.get("key"), "value")

    def test_get_1(self):
        data = """
key: value

[Heading 1]
  other_key:
    if a == "1": value_1
    if a == 2: value_2
    value_3
"""

        manifest = self.compile(data)

        children = list(item for item in manifest.iterchildren())
        section = children[0]

        self.assertEqual(section.get("other_key", {"a": "1"}), "value_1")
        self.assertEqual(section.get("other_key", {"a": 1}), "value_3")

    def test_get_2(self):
        data = """
key:
  if a[1] == "b": value_1
  if a[1] == 2: value_2
  value_3
"""

        manifest = self.compile(data)

        self.assertEqual(manifest.get("key", {"a": "ab"}), "value_1")
        self.assertEqual(manifest.get("key", {"a": [1, 2]}), "value_2")

    def test_get_3(self):
        data = """
key:
  if a[1] == "ab"[1]: value_1
  if a[1] == 2: value_2
  value_3
"""

        manifest = self.compile(data)

        self.assertEqual(manifest.get("key", {"a": "ab"}), "value_1")
        self.assertEqual(manifest.get("key", {"a": [1, 2]}), "value_2")

    def test_set_0(self):
        data = """
key:
  if a == "a": value_1
  if a == "b": value_2
  value_3
"""
        manifest = self.compile(data)

        manifest.set("new_key", "value_new")

        self.assertEqual(manifest.get("new_key"), "value_new")

    def test_set_1(self):
        data = """
key:
  if a == "a": value_1
  if a == "b": value_2
  value_3
"""

        manifest = self.compile(data)

        manifest.set("key", "value_new")

        self.assertEqual(manifest.get("key"), "value_new")
        self.assertEqual(manifest.get("key", {"a": "a"}), "value_1")

    def test_set_2(self):
        data = """
key:
  if a == "a": value_1
  if a == "b": value_2
  value_3
"""

        manifest = self.compile(data)

        expr = BinaryExpressionNode(BinaryOperatorNode("=="),
                                    VariableNode("a"),
                                    NumberNode("1"))

        manifest.set("key", "value_new", expr)

        self.assertEqual(manifest.get("key", {"a": 1}), "value_new")
        self.assertEqual(manifest.get("key", {"a": "a"}), "value_1")

    def test_api_0(self):
        data = """
key:
  if a == 1.5: value_1
  value_2
key_1: other_value
"""
        manifest = self.compile(data)

        self.assertFalse(manifest.is_empty)
        self.assertEqual(manifest.root, manifest)
        self.assertTrue("key_1" in manifest)
        self.assertFalse("key_2" in manifest)

        self.assertEqual(set(manifest.keys()), set(["key", "key_1"]))
