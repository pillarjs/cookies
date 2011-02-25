Cookies
=======

Cookies is a [node.js](http://nodejs.org/) module for getting and setting HTTP(S) cookies, optionally using Keygrip for signing values to prevent tampering.

## Requirements

* [node.js](http://nodejs.org/), tested with 0.4.1

## Install

    $ npm install cookies
    
## API

### cookies = new Cookies( request, response, [ Object keygrip ] )

### cookies.get( "name", [ options ] )

### cookies.set( "name", "value", [ options ] )

## Example

## TODO

* Look for existing outbound cookies to prevent duplicates

Copyright
---------

Copyright (c) 2011 Jed Schmidt. See LICENSE.txt for details.

Send any questions or comments [here](http://twitter.com/jedschmidt).