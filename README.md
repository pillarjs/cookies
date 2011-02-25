Cookies
=======

Cookies is a [node.js](http://nodejs.org/) module for getting and setting HTTP(S) cookies. Cookies can be signed to prevent tampering, using [Keygrip](https://github.com/jed/keygrip).

## Requirements

* [node.js](http://nodejs.org/), tested with 0.4.1

## Install

    $ npm install cookies
    
## API

### cookies = new Cookies( request, response, [ Object keygrip ] )

This creates a cookie jar corresponding to the current _request_ and _response_. A [Keygrip](https://github.com/jed/keygrip) object can optionally be passed as the third argument _keygrip_ to enable cryptographic signing based on SHA1 HMAC, using rotated credentials.

Note that since this only saves parameters without any other processing, it is very lightweight. Cookies are only parsed on demand when they are accessed.

### cookies.get( name, [ options ] )

This extracts the cookie with the given name from the `Cookie` header in the request. If such a cookie exists, its value is returned. Otherwise, nothing is returned.

`{ signed: true }` can optionally be passed as the second parameter _options_. In this case, a signature cookie (a cookie of same name ending with the `.sig` suffix appended) is fetched. If no such cookie exists, nothing is returned.

If the signature cookie _does_ exist, the provided [Keygrip](https://github.com/jed/keygrip) object is used to check whether the hash of _<cookie-name>_ + `=` + _<cookie-value>_ matches that of any registered key:

* If the signature cookie hash matches the first key, the original cookie value is returned.
* If the signature cookie hash matches any other key, the original cookie value is returned AND an outbound header is set to update the signature cookie's value to the hash of the first key. This enables automatic freshening of signature cookies that have become stale due to key rotation.
* If the signature cookie hash does not match any key, nothing is returned, and an outbound header with an expired date is used to delete the cookie.

### cookies.set( name, [ value ], [ options ] )

This sets the given cookie in the response and returns the current context to allow chaining.

If the _name_ is omitted, an outbound header with an expired date is used to delete the cookie.

If the _options_ object is provided, it will be used to generate the outbound cookie header as follows:

* `expires`: a `Date` object indicating the cookie's expiration date
* `path`: a string indicating the path of the cookie
* `domain`: a string indicating the domain of the cookie
* `secure`: a boolean indicating whether the cookie is only to be sent over HTTPS
* `httpOnly`: a boolean indicating whether the cookie is only to be sent over HTTP(S), and not from the client Javascript
* `signed`: a boolean indicating whether the cookie is to be signed. If this is true, another cookie of the same name with the `.sig` suffix appended will also be sent, with a 27-byte url-safe base64 SHA1 value representing the hash of _<cookie-name>_ + `=` + _<cookie-value>_ against the first [Keygrip](https://github.com/jed/keygrip) key. This signature key is used to detect tampering the next time a cookie is received.

## Example

## TODO

* Look for existing outbound cookies to prevent duplicates

Copyright
---------

Copyright (c) 2011 Jed Schmidt. See LICENSE.txt for details.

Send any questions or comments [here](http://twitter.com/jedschmidt).