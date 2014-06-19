
describe('Encrypted Cookies', function () {
  describe('Getting/Setting', function () {
    var string = "something \n really \n crazy"
    var cookie

    before(function () {
      serve(function (req, res) {
        var cookies = Cookies(req, res)

        if (req.method === 'POST') {
          cookies.encrypt('unsigned', string)
        } else {
          res.end(cookies.decrypt('unsigned'))
        }

        res.end()
      })
    })

    it('should set an encrypted cookie', function (done) {
      request(server)
      .post('/')
      .expect('Set-Cookie', /^unsigned\.enc=[\w-]+; path=\/; httponly$/)
      .expect(200, function (err, res) {
        if (err) return done(err)

        cookie = res.headers['set-cookie'][0]
        done()
      })
    })

    it('should get an encrypted cookie', function (done) {
      request(server)
      .get('/')
      .set('Cookie', cookie)
      .expect(200)
      .expect(string, done)
    })
  })

  describe('Rotation', function () {
    it('should rotate old keys', function (done) {
      var cookie

      serve(function (req, res) {
        var cookies = require('..')(['qwer'])(req, res)
        cookies.encrypt('foo', 'bar')
        res.end()
      })

      request(server)
      .get('/')
      .expect(200, function (err, res) {
        if (err) return done(err)

        cookie = res.headers['set-cookie'][0]
        assert(cookie)

        serve(function (req, res) {
          var cookies = Cookies(req, res)
          res.end(cookies.decrypt('foo'))
        })

        request(server)
        .get('/')
        .set('Cookie', cookie)
        .expect(200)
        .expect('Set-Cookie', /^foo\.enc=[\w-]+; path=\/; httponly$/)
        .expect('bar', done)
      })
    })
  })

  describe('Invalid', function () {
    it('should return nothing if the message is invalid', function (done) {
      serve(function (req, res) {
        var cookies = Cookies(req, res)
        if (req.method === 'POST') {
          cookies.set('foo.enc', 'asdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf')
        } else {
          res.end(cookies.decrypt('foo') || '')
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
