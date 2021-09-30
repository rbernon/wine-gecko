# ipdl_lextab.py. This file automatically created by PLY (version 3.11). Don't edit!
_tabversion   = '3.10'
_lextokens    = set(('ANSWER', 'AS', 'ASYNC', 'BOTH', 'BRIDGES', 'CALL', 'CHILD', 'CLASS', 'COLONCOLON', 'COMPRESS', 'COMPRESSALL', 'DELETE', 'FROM', 'GOTO', 'HIGH', 'ID', 'INCLUDE', 'INTR', 'MANAGER', 'MANAGES', 'NAMESPACE', 'NORMAL', 'NULLABLE', 'OPENS', 'OR', 'PARENT', 'PRIO', 'PROTOCOL', 'RECV', 'RETURNS', 'SEND', 'SPAWNS', 'START', 'STATE', 'STRING', 'STRUCT', 'SYNC', 'UNION', 'UPTO', 'URGENT', 'USING', '__DELETE__'))
_lexreflags   = 64
_lexliterals  = '(){}[]<>;:,~'
_lexstateinfo = {'INITIAL': 'inclusive'}
_lexstatere   = {'INITIAL': [('(?P<t_linecomment>//[^\\n]*)|(?P<t_multilinecomment>/\\*(\\n|.)*?\\*/)|(?P<t_NL>(?:\\r\\n|\\n|\\n)+)|(?P<t_ID>[a-zA-Z_][a-zA-Z0-9_]*)|(?P<t_STRING>"[^"\\n]*")|(?P<t_COLONCOLON>::)', [None, ('t_linecomment', 'linecomment'), ('t_multilinecomment', 'multilinecomment'), None, ('t_NL', 'NL'), ('t_ID', 'ID'), ('t_STRING', 'STRING'), (None, 'COLONCOLON')])]}
_lexstateignore = {'INITIAL': ' \x0c\t\x0b'}
_lexstateerrorf = {'INITIAL': 't_error'}
_lexstateeoff = {}
