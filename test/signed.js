
describe('Signed Cookies', function () {
  describe('Getting/Setting', function () {
    var string = "bar"
    var cookies

    before(function () {
      serve(function (req, res) {
        var cookies = Cookies(req, res)

        if (req.method === 'POST') {
          cookies.sign('foo', string)
        } else {
          res.end(cookies.unsign('foo'))
        }

        res.end()
      })
    })

    it('should set a signed cookie', function (done) {
      request(server)
      .post('/')
      .expect(200, function (err, res) {
        if (err) return done(err)

        cookies = res.headers['set-cookie']
        assert.equal('foo=bar; path=/; httponly', cookies[0])
        assert(/^foo.sig=[\w-]+; path=\/; httponly$/.test(cookies[1]))
        done()
      })
    })

    it('should get a signed cookie', function (done) {
      request(server)
      .get('/')
      .set('Cookie', cookies.join(';'))
      .expect(200)
      .expect(string, done)
    })
  })

  describe('Getting/Setting with base64 encoding', function () {
    var string = "bar lkajsdfljk !*()@)#*(!@#)"
    var cookies

    before(function () {
      serve(function (req, res) {
        var cookies = Cookies(req, res)

        if (req.method === 'POST') {
          cookies.sign('foo', string, {
            encoded: true
          })
        } else {
          res.end(cookies.unsign('foo', {
            encoded: true
          }))
        }

        res.end()
      })
    })

    it('should set a signed cookie', function (done) {
      request(server)
      .post('/')
      .expect(200, function (err, res) {
        if (err) return done(err)

        cookies = res.headers['set-cookie']
        assert(/^foo.b64=[\w-]+; path=\/; httponly$/.test(cookies[0]))
        assert(/^foo.sig=[\w-]+; path=\/; httponly$/.test(cookies[1]))
        done()
      })
    })

    it('should get a signed cookie', function (done) {
      request(server)
      .get('/')
      .set('Cookie', cookies.join(';'))
      .expect(200)
      .expect(string, done)
    })
  })

  describe('Invalid Signatures', function () {
    it('should return nothing when no signature exists', function (done) {
      serve(function (req, res) {
        var cookies = Cookies(req, res)
        if (req.method === 'POST') {
          cookies.set('foo', 'bar')
        } else {
          res.end(cookies.unsign('foo') || '')
        }

        res.end()
      })

      request(server)
      .post('/')
      .expect(200, function (err, res) {
        if (err) return done(err)

        request(server)
        .get('/')
        .set('Cookie', res.headers['set-cookie'].join(';'))
        .expect(200)
        .expect('', done)
      })
    })

    it('should return nothing when the signature is invalid', function (done) {
      serve(function (req, res) {
        var cookies = Cookies(req, res)
        if (req.method === 'POST') {
          cookies.set('foo', 'bar')
          cookies.set('foo.sig', 'lkjasdfasdf')
        } else {
          res.end(cookies.unsign('foo') || '')
        }

        res.end()
      })

      request(server)
      .post('/')
      .expect(200, function (err, res) {
        if (err) return done(err)

        request(server)
        .get('/')
        .set('Cookie', res.headers['set-cookie'].join(';'))
        .expect(200)
        .expect('', done)
      })
    })
  })
})
