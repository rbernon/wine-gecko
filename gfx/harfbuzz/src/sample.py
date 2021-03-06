#!/usr/bin/python
# -*- coding: utf-8 -*-


import sys
from gi.repository import HarfBuzz as hb
from gi.repository import GLib

# Python 2/3 compatibility
try:
	str
except NameError:
	str = str

def tounicode(s, encoding='utf-8'):
	if not isinstance(s, str):
		return s.decode(encoding)
	else:
		return s

fontdata = open (sys.argv[1], 'rb').read ()
text = tounicode(sys.argv[2])
# Need to create GLib.Bytes explicitly until this bug is fixed:
# https://bugzilla.gnome.org/show_bug.cgi?id=729541
blob = hb.glib_blob_create (GLib.Bytes.new (fontdata))
face = hb.face_create (blob, 0)
del blob
font = hb.font_create (face)
upem = hb.face_get_upem (face)
del face
hb.font_set_scale (font, upem, upem)
#hb.ft_font_set_funcs (font)
hb.ot_font_set_funcs (font)

buf = hb.buffer_create ()
class Debugger(object):
	def message (self, buf, font, msg, data, _x_what_is_this):
		print(msg)
		return True
debugger = Debugger()
hb.buffer_set_message_func (buf, debugger.message, 1, 0)
hb.buffer_add_utf8 (buf, text.encode('utf-8'), 0, -1)
hb.buffer_guess_segment_properties (buf)

hb.shape (font, buf, [])
del font

infos = hb.buffer_get_glyph_infos (buf)
positions = hb.buffer_get_glyph_positions (buf)

for info,pos in zip(infos, positions):
	gid = info.codepoint
	cluster = info.cluster
	x_advance = pos.x_advance
	x_offset = pos.x_offset
	y_offset = pos.y_offset

	print("gid%d=%d@%d,%d+%d" % (gid, cluster, x_advance, x_offset, y_offset))
