#!/usr/bin/env node
const inquirer = require('inquirer')
const chalk = require('chalk')
const { promises: fs } = require('fs')

const login_isa = require('./lib/login-isa')
const connect_isa = require('./lib/connect-isa')
const generate_inquirer_select_courses = require('./util/generate-inquirer-select-courses')
const notify = require('./util/notify')
const await_keypress = require('./util/await-keypress')
const disable_auto_logout = require('./lib/auto-logout-disabler')
const Watcher = require('./Watcher')

const ISA_ADDR = 'https://isa.epfl.ch/imoniteur_ISAP'

// Start

let begin = () => {
    const args = process.argv.slice(2)
    if (args.length > 0)
        return require('./cli-args')(ISA_ADDR, args)

    start()
}

// Login menu

let start = async () => {
    console.log(`Using ${ISA_ADDR}`)
    const choice = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: ['Login to ISA', 'Login to ISA with Cookie', 'About this tool']
    })

    if (choice.action === 'Login to ISA')
        return login()

    if (choice.action === 'Login to ISA with Cookie')
        return login_with_cookie()

    if (choice.action === 'About this tool') {
        console.log('See https://github.com/Maeeen/shs-notifier')
        return start()
    }
}

let login = async () => {
    // Login to ISA
    const user_creds = await inquirer.prompt([{
        type: 'input',
        name: 'username',
        message: 'Username',
        validate: t => t.length > 0 ? true : 'Should not be empty'
    }, {
        type: 'password',
        name: 'password',
        message: 'Password',
        validate: t => t.length > 0 ? true : 'Should not be empty'
    }])

    try {
        let token = await login_isa(ISA_ADDR, user_creds)
        console.log(`${chalk.green('✓')} Fetched cookie!`)
        connect(token)
    } catch(e) {
        console.error(`${chalk.red('❌')} Could not connect: ${e}`)
        login()
    }
}

let login_with_cookie = async () => {
    const token = await inquirer.prompt({
        type: 'input',
        name: 'cookie',
        message: 'The cookie (without the ISA-CNXKEY= prefix of the cookie string)',
        validate: t => t.length > 0 ? true : 'Should not be empty'
    })

    connect(token.cookie)
}

let connect = async token => {
    try {
        let {username, logout_delay, course_reg_url} = await connect_isa.fetch_home(ISA_ADDR, token)
        let auto_logout_date = new Date(Date.now() + logout_delay)

        let { person_name, group_name } = await connect_isa.fetch_div_content(ISA_ADDR, token)
        console.log(`${chalk.green('✓')} Successfully logged in as ${username} from ${group_name}!`)

        await load_settings()
        home({ token, username, course_reg_url, person_name })
        disable_auto_logout({ token, auto_logout_date })
    } catch(e) {
        console.error(`${chalk.red('❌')} Could not connect: ${e}`)
        start()
    }
}

// Main program
let user_settings = {
    watched_courses: [],
    polling_interval: 5000,
    notification_settings: {
        do_discord_webhook: false,
        discord_webhook_url: '',
        desktop_notification: true,
        discord_webhook_spam: false,
        do_telegram_bot: false,
        bot_token: "",
        chat_id: 0
    }
}

let home = async ({token, username, course_reg_url, person_name}) => {
    const menu = await inquirer.prompt({
        type: 'list', name: 'action', message: `Welcome ${person_name}`,
        choices: ['Select courses to watch', 'Notification options', 'Notification test', `Edit polling interval (${user_settings.polling_interval}ms)`, 'Load settings', 'Save settings', 'Watch']
    })

    if (menu.action === 'Select courses to watch') {
        const courses = await connect_isa.fetch_courses(ISA_ADDR, token, course_reg_url)
        const inquirerPrompt = {
            ...generate_inquirer_select_courses(courses, user_settings.watched_courses),
            name: 'selected_courses',
            message: 'Select the courses to watch',
            type: 'checkbox'
        }

        const {selected_courses} = await inquirer.prompt(inquirerPrompt)

        if (selected_courses.length === 0)
            console.log(`${chalk.green('✓')} Watching nothing!`)
        else {
            console.log(`${chalk.green('✓')} Watching:`)
            selected_courses.forEach(e => console.log(`${' '.repeat(3)} - ${e}`))
        }

        user_settings.watched_courses = selected_courses.map(course => Object.values(courses).find(v => v.text === course).id)
    }

    if (menu.action === 'Notification options') {
        user_settings.notification_settings = await inquirer.prompt([{
            name: 'do_discord_webhook',
            message: 'Would you like to setup notifications on Discord via webhooks? @everyone will be called.',
            type: 'confirm',
            default: user_settings.notification_settings.do_discord_webhook
        }, {
            name: 'discord_webhook_url',
            message: 'Create a Webhook on Discord, then paste the link here:',
            type: 'input',
            validate: text => /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig.test(text) ? true : 'Not a link.',
            when: answers => answers.do_discord_webhook,
            default: user_settings.notification_settings.discord_webhook_url
        }, {
            name: 'discord_webhook_spam',
            message: 'Would you like that the webhook is spammed (i.e. the message will not be sent once)?',
            type: 'confirm',
            when: answers => answers.do_discord_webhook,
            default: user_settings.notification_settings.discord_webhook_spam
        }, {
            name: 'desktop_notification', message: 'Would you like desktop notifications?', type: 'confirm',
            default: user_settings.notification_settings.desktop_notification
        }, {
            name: 'do_telegram_bot',
            message: 'Would you like to setup notifications on Telegram via a bot?',
            type: 'confirm',
            default: user_settings.notification_settings.do_telegram_bot
        }, {
            name: 'bot_token',
            message: 'Create a bot on telegram (via @BotFather), then paste the token here:',
            type: 'password',
            when: answers => answers.do_telegram_bot,
            default: user_settings.notification_settings.bot_token
        }, {
            name: 'chat_id',
            message: 'Get the chat id of the group (or person via @mychatidbot), then paste it here:',
            type: 'input',
            when: answers => answers.do_telegram_bot,
            default: user_settings.notification_settings.chat_id//TODO : add options to write to many chats.
        }])
        console.log(`${chalk.green('✓')} Understood!`)
    }

    if (menu.action === 'Notification test') {
        notify('test course', user_settings.notification_settings)
    }

    if (menu.action === 'Load settings') {
        await load_settings()
    }

    if (menu.action === 'Save settings') {
        await save_settings()
    }

    if (menu.action.startsWith('Edit polling interval')) {
        const newPollingInterval = await inquirer.prompt({
            name: 'polling_interval',
            message: 'Set the new polling interval in milliseconds',
            validate: n => Number.isNaN(n) ? 'This should be a number' :
                (n >= 250 ? true : 'The polling interval should be greater than 250'),
            default: user_settings.polling_interval,
            filter: input => parseInt(input)
        })
        user_settings.polling_interval = newPollingInterval.polling_interval
    }

    if (menu.action === 'Watch') {
        await watch({token, course_reg_url})
    }

    home({token, username, course_reg_url, person_name})
}

// Settings

let load_settings = async () => {
    try {
        const settingsAsString = await fs.readFile('./shs-notifier-settings.json', 'utf-8')
        user_settings = JSON.parse(settingsAsString)
        console.log(`${chalk.green('✓')} Settings read!`) 
    } catch(e) {
        console.error(`${chalk.red('❌')} Could not read settings file: ${e}`)
    } 
}

let save_settings = async () => {
    try {
        await fs.writeFile('./shs-notifier-settings.json', JSON.stringify(user_settings), 'utf-8')
        console.log(`${chalk.green('✓')} Saved settings!`) 
    } catch(e) {
        console.error(`${chalk.red('❌')} Could not save settings file: ${e}`)
    }
}

// Watch

let watch = async ({ token, course_reg_url }) => {
    const watcher = new Watcher()

    if (user_settings.watched_courses.length === 0) {
        console.log(`${chalk.yellow('⚠')} No courses have been selected. Please select the courses to watch on the main menu.`)
        return
    }

    let remove_from_watching_list = id => {
        let wc = user_settings.watched_courses,
            ind = wc.indexOf(id)

        if (ind > -1)
            wc.splice(ind, 1)
    }

    console.log(`${chalk.yellow('→')} Watching ${user_settings.watched_courses.length} courses… Press c to stop.`)
    console.log('.............')

    watcher.watch(ISA_ADDR, { token, course_reg_url }, user_settings)
    
    watcher.on('available-course', courses => {
        notify(courses.map(d => d.text), user_settings.notification_settings)
        courses.map(d => d.id).forEach(p => remove_from_watching_list(p))
    })

    watcher.on('checked', () => {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(`${chalk.blue('i')} Last update: ${new Date().toLocaleString()}. Watching ${user_settings.watched_courses.length} courses.`)
    })

    return new Promise(async resolve => {
        let loop = async () => {
            let keypress = await await_keypress(process.stdin)

            if (keypress.codePointAt(0) !== 99)
                await loop()
            else {
                watcher.stop()
                console.log(`\n${chalk.red('→')} Stopped watching`)
                resolve()
            }
        }

        await loop()
    })
}

begin()