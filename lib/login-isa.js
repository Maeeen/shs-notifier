const https = require('https')

module.exports = (isa, { username, password }) => {

    return new Promise((res, rej) => {
        const ENDPOINT = '!logins.tryToConnect'
        let data = new URLSearchParams()
        data.append('ww_x_username', username)
        data.append('ww_x_password', password)
        data.append('ww_x_urlAppelant', 'isacademia.htm')
        data = data.toString()
    
        let r = https.request(`${isa}/${ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(data)
            }
        }, resp => {
            if (resp.statusCode != 302)
                return rej(`invalid status code, got ${resp.statusCode} instead of 302`)

            if (!resp.headers.hasOwnProperty('set-cookie') || resp.headers['set-cookie'].length == 0)
                return rej('invalid credentials')

            let cookieText = resp.headers['set-cookie'][0]

            const cookie = /(?:ISA-CNXKEY=){1}([A-z0-9]+)/g.exec(cookieText)[1]
            res(cookie)
        })
    
        r.write(data)
        r.end()
        r.on('error', e => rej(e))
    })

}