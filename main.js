const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const fs = require('fs')
const app = express()
let api;
if(process.argv.includes('server')) api = require('./api')
else api = require('./api_client')

const file = ((res, path) => {
    res.sendFile(__dirname + '/' + path)
})

app.use(cors())
app.use(bodyParser.text({ type: '*/*' }))

const SECERET = process.env.SECERET || process.argv[3]

app.post('/client/:secret/:file', (req, res) => {
    if(req.params.secret === process.argv[3]) {
        fs.writeFileSync('./storage/' + req.params.file.replaceAll('^', '/'), req.body)
        _api.response.build(res, 200, 'ok')
    } else _api.response.build(res, 401, 'unauthorized')
})

app.get('/client/:secret/:file', (req, res) => {
    if(req.params.secret === process.argv[3]) {
        file(res, './storage/' + req.params.file.replaceAll('^', '/'))
    } else _api.response.build(res, 401, 'unauthorized')
})

app.get('/client/readdir/:secret/:path', (req, res) => {
    if(req.params.secret === process.argv[3]) {
        res.send(fs.readdirSync('./storage/' + req.params.path.replaceAll('^', '/')))
    } else _api.response.build(res, 401, 'unauthorized')
})

/* bullshit */
app.get('/', (req, res) => file(res, '/pages/main.html'))
app.get('/cascadia.woff', (req, res) => file(res, '/pages/cascadia.woff'))
app.get('/dot.png', (req, res) => file(res, '/pages/dot.png'))
app.get('/ping', (req, res) => res.send('pong!'))
app.get('/posts', (req, res) => res.send(fs.readdirSync('./storage/posts').length.toString()))
/* accounts */
app.get('/authorize/:username/:password', (req, res) => res.send(api.user.authorize(req.params.username, req.params.password)))
app.post('/register/:username/:password', (req, res) => res.send(api.user.register(req.params.username, req.params.password)))
/* posts */
app.get('/filter/:parent', (req, res) => res.send(api.post.all(req.params.parent)))
app.get('/post/:post', (req, res) => res.send(api.post.get(req.params.post)))
app.post('/post/:author/:password/:parent/:title', (req, res) => {
    if (api.user.authorize(req.params.author, req.params.password)) {
        if (!api.user.ratelimit(req.params.author)) {
            api.post.set(req.params.parent, req.params.author, req.body, req.params.title)
            api.response.build(res, 200, fs.readdirSync('./storage/posts').length - 1)
        } else {
            res.send(api.response.build(res, 420, 'dotrun pass denied'))
        }
    } else {
        api.response.build(res, 401, 'wrong password or smth idk')
    }
})

app.listen(80, () => console.log('port 80 online'))
app.listen(8080, () => console.log('port 8080 online'))