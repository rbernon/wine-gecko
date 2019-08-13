import urllib.request, urllib.parse, urllib.error

def main(request, response):
    response.headers.set('Set-Cookie', urllib.parse.unquote(request.url_parts.query))
    return [("Content-Type", "text/plain")], ""
