
describe('Raw Cookies', function () {
  describe('Getting/Setting', function () {
    before(function () {
      serve(function (req, res) {
        var cookies = Cookies(req, res)

        if (req.method === 'POST') {
          cookies.set('unsigned', 'foo')
        } else {
          res.end(cookies.get('unsigned'))
        }

        res.end()
      })
    })

    it('should set an unsigned cookie', function (done) {
      request(server)
      .post('/')
      .expect('Set-Cookie', 'unsigned=foo; path=/; httponly')
      .expect(200, done)
    })

    it('should get an unsigned cookie', function (done) {
      request(server)
      .get('/')
      .set('Cookie', 'unsigned=foo; path=/; httponly')
      .expect(200)
      .expect('foo', done)
    })
  })

  describe('Options', function () {
    it('should set httponly by default', function (done) {
      serve(function (req, res) {
        var cookies = Cookies(req, res)
        cookies.set('unsigned', 'foo')
        res.end()
      })

      request(server)
      .post('/')
      .expect('Set-Cookie', 'unsigned=foo; path=/; httponly')
      .expect(200, done)
    })

    it('should set optionally set httponly to false', function (done) {
      serve(function (req, res) {
        var cookies = Cookies(req, res)
        cookies.set('unsigned', 'foo', {
          httpOnly: false
        })
        res.end()
      })

      request(server)
      .post('/')
      .expect('Set-Cookie', 'unsigned=foo; path=/')
      .expect(200, done)
    })

    it('should set optionally set path', function (done) {
      serve(function (req, res) {
        var cookies = Cookies(req, res)
        cookies.set('unsigned', 'foo', {
          path: '/whatever'
        })
        res.end()
      })

      request(server)
      .post('/')
      .expect('Set-Cookie', 'unsigned=foo; path=/whatever; httponly')
      .expect(200, done)
    })
  })

  describe('Overwriting', function () {
    it('should by default overwrite cookies of the same name', function (done) {
      serve(function (req, res) {
        var cookies = Cookies(req, res)
        cookies.set('unsigned', '1')
        cookies.set('unsigned', '2')
        cookies.set('unsigned', '3')
        res.end()
      })

      request(server)
      .get('/')
      .expect('Set-Cookie', 'unsigned=3; path=/; httponly')
      .expect(200, function (err, res) {
        if (err) return done(err)
        assert.equal(1, res.headers['set-cookie'].length)
        done()
      })
    })

    it('should optionally not overwrite cookies', function (done) {
      serve(function (req, res) {
        var cookies = Cookies(req, res)
        var overwrite = {
          overwrite: false
        }
        cookies.set('unsigned', '1', overwrite)
        cookies.set('unsigned', '2', overwrite)
        cookies.set('unsigned', '3', overwrite)
        res.end()
      })

      request(server)
      .get('/')
      .expect('Set-Cookie', 'unsigned=1; path=/; httponly,unsigned=2; path=/; httponly,unsigned=3; path=/; httponly')
      .expect(200, function (err, res) {
        if (err) return done(err)
        assert.equal(3, res.headers['set-cookie'].length)
        done()
      })
    })
  })

  describe('Max Age', function () {
    it('should set max age', function (done) {
      var date

      serve(function (req, res) {
        var cookies = Cookies(req, res)
        cookies.set('foo', 'bar', {
          maxAge: 30000
        })
        date = new Date(Date.now() + 30000)
        res.end()
      })

      request(server)
      .get('/')
      .expect(200, function (err, res) {
        if (err) return done(err)

        assert.equal(
          'foo=bar; path=/; expires=' + date.toUTCString() + '; httponly',
          res.headers['set-cookie'][0]
        )

        done()
      })
    })
  })
})
