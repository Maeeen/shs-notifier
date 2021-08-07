module.exports = stdin => {
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    return new Promise(res => stdin.once('data', k => {
        res(k)

        if (k.codePointAt(0) == 3)
            process.exit()
        stdin.setRawMode(false)
    }))
}