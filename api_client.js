const request = require('sync-request')
const API_SERVER_URL = 'http://localhost/client/'
const API_SECERT = process.env.SECERET || process.argv[3]
const get = ((url) => request('GET', API_SERVER_URL + url).getBody())
const post = ((url, body) => request('POST', API_SERVER_URL + url, body).getBody())
const fs = {
    readFileSync: ((path) => get(API_SECERT + '/' + path)),
    writeFileSync: ((path, body) => post(API_SECERT + '/' + path, body)),
    readdirSync: ((path) => get(API_SECERT + '/readdir/' + path))
}
const crypto = require('crypto')

const _api = module.exports = {
    sha256: ((string) => {
        const lines = string.split('\n')
        const hash = crypto.createHash('sha256');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim(); // remove leading/trailing whitespace
            if (line === '') continue; // skip empty lines
            hash.write(line); // write a single line to the buffer
        }
        return hash.digest('hex');
    }),
    hash: ((string, loops) => {
        let hash = _api.sha256(string)
        for (let i = 0; i < loops; i++) {
            hash = _api.sha256(hash)
            hash += hash[0] + hash[hash.length - 1]
        }
        return hash
    }),
    post: {
        get: ((id) => {
            if (!fs.existsSync('./storage/posts/' + id + '.json')) return { id: '-1' }
            const data = JSON.parse(fs.readFileSync('./storage/posts/' + id + '.json', 'utf8'))
            return data
        }),
        set: ((parent = '-1', author = 'anon', body, title = body.split('\n')[0].replace(/^\s+|\s+$/g, '').substring(0, 20)) => {
            fs.writeFileSync('./storage/posts/' + fs.readdirSync('./storage/posts').length + '.json', JSON.stringify({
                id: fs.readdirSync('./storage/posts').length,
                parent: parent.toString(),
                author: author,
                timestamp: +new Date(),
                title: title,
                body: body.replaceAll(/&/g, '&amp;')
                    .replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;')
                    .replaceAll(/"/g, '&quot;').replaceAll(/'/g, '&#039;')
                    .replaceAll(/\$IMG\[\[/g, '<img src="').replaceAll(/\]\]/g, '">')
            }))
        }),
        all: ((parent = '-1') => {
            const posts = fs.readdirSync('./storage/posts')
            const data = []
            for (let i = 0; i < posts.length; i++) {
                let post = JSON.parse(fs.readFileSync('./storage/posts/' + posts[i], 'utf8'))
                if (post.parent.toString() === parent.toString()) data.push(post)
            }
            return data
        })
    },
    response: {
        build: ((res, code = -1, message = 'idk server shit') => {
            res.status(code).send({
                code: code,
                message: message
            })
        })
    },
    user: {
        authorize: ((username, password) => {
            if (username === 'anon') return true
            if (fs.existsSync('./storage/users/' + username + '.json')) {
                const data = JSON.parse(fs.readFileSync('./storage/users/' + username + '.json', 'utf8'))
                if (data.password === _api.hash(password)) return true
            }
        }),
        register: ((username, password) => {
            // check if username is built only out of letters, numbers and underscores
            if (!username.match(/^[a-zA-Z0-9_]+$/)) return { code: 401, message: 'username is not built only out of letters, numbers and underscores' }
            if (fs.existsSync('./storage/users/' + username + '.json')) return false
            fs.writeFileSync('./storage/users/' + username + '.json', JSON.stringify({
                timestamp: +new Date(),
                password: _api.hash(password)
            }))
            return true
        }),
        last: ((username) => {
            // get latest post by user from feed
            const posts = fs.readdirSync('./storage/posts')
            const data = []
            for (let i = 0; i < posts.length; i++) {
                let post = JSON.parse(fs.readFileSync('./storage/posts/' + posts[i], 'utf8'))
                if (post.author === username) data.push(post)
            }
            return data[data.length - 1]?.timestamp || 0
        }),
        ratelimit: ((username) => {
            if (username === 'anon' && Math.floor(Math.random() * 20) === 1) return true
            if (fs.existsSync('./storage/users/' + username + '.json')) {
                if (parseInt(_api.user.last(username)) + 10000 > +new Date()) return true
                else return false
            } else return false
        })
    }
}