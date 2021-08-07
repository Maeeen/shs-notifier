const { Separator } = require('inquirer')

module.exports = (courses, selected = []) => {
    const choices = []

    let add = path => {
        let course = courses[path]
        if (!course.isCourse) {
            choices.push(new Separator(`${' '.repeat(course.level)} ${course.text}`))
        } else {
            choices.push({
                checked: selected.includes(path),
                name: courses[path].text
            })
        }

        Object.keys(courses).filter(p => p.substring(0, p.lastIndexOf('.')) == path).forEach(p => add(p))
    }

    add(Object.keys(courses)[0])

    return {
        choices,
        pageSize: process.stdout.rows - 3
    }
}