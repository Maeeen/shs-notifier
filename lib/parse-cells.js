module.exports = nodes => nodes.map(element => {
    const portal = element.getAttribute('ewnet:portal')
    let obj = {}

    portal.split(';').forEach(pair => {
        let [key, val] = pair.split(':')
        if (!key || !val)
            return

        key = key.trim()
        val = val.trim()
        obj[key] = val
    })

    return obj
})