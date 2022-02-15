# SHS Notifier [![npm version](https://img.shields.io/npm/v/shs-notifier)](https://www.npmjs.com/package/shs-notifier) ![works on my machine](https://img.shields.io/badge/works%20on-my%20machine-orange)

:warning: This project is meant to be used on [EPFL's IS-Academia](https://isa.epfl.ch). No support will be given on any other ISA infrastructures.

# Demo

![Demonstration](./misc/demo.gif)
## Its goal

Its goal is to detect when a course is going to be available by polling ISA's website, and notifying when one or multiple courses are available.

## How to install?

### Via [npm](https://www.npmjs.com/package/shs-notifier)

* Install [node.js](https://nodejs.org/en/download)
* Install `shs-notifier` via npm: `npm i -g shs-notifier`

### Clone it

* Install [node.js](https://nodejs.org/en/download)
* Open up a terminal and clone the project (`git clone https://github.com/Maeeen/shs-notifier`), then type `cd shs-notifier`
* `npm i`

## How to use?

There is two ways to use this tool. The first one involves following an interactive CLI and the other one is suited for server deployment via command-line arguments.

### Interactive CLI version

* Simply execute the program (`node .` if you cloned, or `npx shs-notifier` via npm)
* Follow the instructions! I hope it is friendly enough.

### Command-line arguments

```
    -h, --help                 : Prints this
    --cookie=<cookie>          : Log in with this isa-cookie (mandatory or --creds)
    --creds=<user>*<pass>      : Log in with the given credentials (mandatory or --cookie)
    --watch=<course_ids>       : Watch courses with the given courses' id, separated by commas
    --discord-webhook-url=<url>: Will trigger the given discord's webhook when the course is available
    --spam-discord             : Spam the webhook instead of only one send. Default=false
    --disable-desktop-notify   : Disables desktop notification
    --polling-interval=<int>   : The polling interval, in milliseconds. Default=5000
    --tg-creds=<token>*<id>    : Bot token and dst chat id, update and activate telegram bot.

```


## Code quality

This is not a well written program, and to be honest, I do not care. There is maybe 4 comments in the whole project. And oh yeah, I am a lazy guy.

## Project's name origin

Anyone at EPFL can guess it lol.
