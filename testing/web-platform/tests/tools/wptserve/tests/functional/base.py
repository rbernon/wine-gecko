import base64
import logging
import os
import unittest
import urllib.request, urllib.parse, urllib.error
import urllib.request, urllib.error, urllib.parse
import urllib.parse

import wptserve

logging.basicConfig()

here = os.path.split(__file__)[0]
doc_root = os.path.join(here, "docroot")

class Request(urllib.request.Request):
    def __init__(self, *args, **kwargs):
        urllib.request.Request.__init__(self, *args, **kwargs)
        self.method = "GET"

    def get_method(self):
        return self.method

    def add_data(self, data):
        if hasattr(data, "iteritems"):
            data = urllib.parse.urlencode(data)
        print(data)
        self.add_header("Content-Length", str(len(data)))
        urllib.request.Request.add_data(self, data)

class TestUsingServer(unittest.TestCase):
    def setUp(self):
        self.server = wptserve.server.WebTestHttpd(host="localhost",
                                                   port=0,
                                                   use_ssl=False,
                                                   certificate=None,
                                                   doc_root=doc_root)
        self.server.start(False)

    def tearDown(self):
        self.server.stop()

    def abs_url(self, path, query=None):
        return urllib.parse.urlunsplit(("http", "%s:%i" % (self.server.host, self.server.port), path, query, None))

    def request(self, path, query=None, method="GET", headers=None, body=None, auth=None):
        req = Request(self.abs_url(path, query))
        req.method = method
        if headers is None:
            headers = {}

        for name, value in headers.items():
            req.add_header(name, value)

        if body is not None:
            req.add_data(body)

        if auth is not None:
            req.add_header("Authorization", "Basic %s" % base64.encodestring('%s:%s' % auth))

        return urllib.request.urlopen(req)
