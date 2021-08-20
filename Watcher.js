const EventEmitter = require('events')
const connect_isa = require('./lib/connect-isa')

module.exports = class Watcher extends EventEmitter {
    constructor() {
        super()
        this.interval = null
    }
    
    watch(ISA_ADDR, { token, course_reg_url }, { watched_courses, polling_interval }) {
        if (this.interval != null)
            return

        this.interval = setInterval(async () => {
            try {
                const courses = await connect_isa.fetch_courses(ISA_ADDR, token, course_reg_url)
                const wc = watched_courses
                const now_available_courses = wc.map(id => courses[id])
                            .filter(d => !!d)
                            .filter(d => d.isAvailable)
                            .filter(d => watched_courses.includes(d.id))

                if (now_available_courses.length > 0) {
                    this.emit('available-course', now_available_courses)
                    let unwatch = id => {
                        let ind = watched_courses.indexOf(id)
            
                        if (ind > -1)
                            watched_courses.splice(ind, 1)
                    }

                    now_available_courses.map(d => d.id).forEach(i => unwatch(i))
                }

                this.emit('checked')
            } catch(e) {
                this.emit('error', e)
            }
        }, polling_interval)
    }

    stop() {
        clearInterval(this.interval)
        this.interval = null
    }
}