const login_isa = require('./lib/login-isa')
const connect_isa = require('./lib/connect-isa')
const auto_logout_disabler = require('./lib/auto-logout-disabler')
const Watcher = require('./Watcher')
const notify = require('./util/notify')

const fail = reason => {
    console.error(`Error: ${reason}`)
    process.exit(1)
}

const print_help = () => {
    console.log(`shs-notifier (https://github.com/Maeeen/shs-notifier)

Usage:
    -h, --help                 : Prints this
    --cookie=<cookie>          : Log in with this isa-cookie (mandatory or --creds)
    --creds=<user>*<pass>      : Log in with the given credentials (mandatory or --cookie)
    --watch=<course_ids>       : Watch courses with the given courses' id, separated by commas
    --discord-webhook-url=<url>: Will trigger the given discord's webhook when the course is available
    --spam-discord             : Spam the webhook instead of only one send. Default=false
    --disable-desktop-notify   : Disables desktop notification
    --polling-interval=<int>   : The polling interval, in milliseconds. Default=5000

This tool is not endorsed by any organization.
`)
}

module.exports = async (ISA_ADDR, args) => {
    if (args.includes('-h') || args.includes('--help')) {
        print_help()
        return
    }

    let find_arg = begins_with => args.filter(d => d.startsWith(begins_with)).map(d => d.substring(begins_with.length)).find(d => true)

    let cookie

    const credsArg = find_arg('--creds=')
    if (credsArg) {
        let split = credsArg.split('*')
        let username = split.shift()
        let password = split.join('*') // in the case where the password contains weird ass characters

        console.log(process.argv)
        if (username && password) {
            try {
                cookie = await login_isa(ISA_ADDR, { username, password })
            } catch(e) {
                return fail('Invalid credentials')
            }
        }
    }

    const cookieArg = find_arg('--cookie=')
    if (cookieArg) {
        cookie = cookieArg
    }

    if (!cookie)
        return fail('No credentials or cookie given. Can not login to IS-Academia.')

    let course_reg_url, courses, auto_logout_date
    try {
        // Verifying access
        const home_data = await connect_isa.fetch_home(ISA_ADDR, cookie)
        course_reg_url = home_data.course_reg_url
        auto_logout_date = new Date(Date.now() + home_data.logout_delay)


        courses = await connect_isa.fetch_courses(ISA_ADDR, cookie, course_reg_url)
    } catch(e) {
        return fail('Invalid cookie')
    }

    const coursesIdArg = find_arg('--watch=')
    if (!coursesIdArg)
        return fail('No given courses to watch')

    const watched_courses = coursesIdArg.split(',')
    watched_courses.forEach(id => {
        if (courses.hasOwnProperty(id))
            console.log(`Watching ${courses[id].text}`)
        else
            console.warn(`Warning: can not find course with the id ${id}`)
    })

    let polling_interval = 5000
    const pollingIntervalArg = find_arg('--polling-interval=')
    if (pollingIntervalArg) {
        let temp = parseInt(pollingIntervalArg)

        if (!Number.isNaN(temp))
            polling_interval = temp
        else
            console.warn(`Warning: The given polling interval is invalid.`)
    }

    const notification_settings = {
        do_discord_webhook: false,
        discord_webhook_url: '',
        desktop_notification: !args.includes('--disable-desktop-notify'),
        discord_webhook_spam: args.includes('--spam-discord')
    }

    const discordWebhookUrlArg = find_arg('--discord-webhook-url=')
    if (discordWebhookUrlArg) {
        if (/[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig.test(discordWebhookUrlArg)) {
            notification_settings.do_discord_webhook = true
            notification_settings.discord_webhook_url = discordWebhookUrlArg
        } else {
            console.warn(`Warning: The given discord webhook url is invalid.`)
        }
    }

    const watcher = new Watcher()

    auto_logout_disabler({ token: cookie, auto_logout_date })

    watcher.on('available-course', courses => {
        notify(courses.map(d => d.text), notification_settings)
    })

    if (args.includes('--debug')) {
        setTimeout(() => notify('ptdrrr', notification_settings), 10000)
    }

    watcher.on('checked', () => {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(`Last update: ${new Date().toLocaleString()}. Watching ${watched_courses.length} courses.`)
    })

    watcher.watch(ISA_ADDR, { token: cookie, course_reg_url }, { watched_courses, polling_interval })
}