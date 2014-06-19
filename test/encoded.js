
describe('Base64 Encoded Cookies', function () {
  describe('Getting/Setting', function () {
    var string = "something \n really \n crazy"
    var cookie

    before(function () {
      serve(function (req, res) {
        var cookies = Cookies(req, res)

        if (req.method === 'POST') {
          cookies.encode('unsigned', string)
        } else {
          res.end(cookies.decode('unsigned'))
        }

        res.end()
      })
    })

    it('should set an encoded cookie', function (done) {
      request(server)
      .post('/')
      .expect('Set-Cookie', /^unsigned=[\w-]+; path=\/; httponly$/)
      .expect(200, function (err, res) {
        if (err) return done(err)

        cookie = res.headers['set-cookie'][0]
        done()
      })
    })

    it('should get an encoded cookie', function (done) {
      request(server)
      .get('/')
      .set('Cookie', cookie)
      .expect(200)
      .expect(string, done)
    })
  })
})
