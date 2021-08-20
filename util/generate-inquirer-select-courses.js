const { Separator } = require('inquirer')

module.exports = (courses, selected = []) => {
    const choices = []
    courses = Object.values(courses)

    let add = path => {
        let course = courses.find(c => c.path == path)
        if (!course.isCourse) {
            choices.push(new Separator(`${' '.repeat(course.level)} ${course.text}`))
        } else {
            choices.push({
                checked: selected.includes(course.id),
                disabled: course.isAvailable ? 'Not available (see ISA)' : false,
                name: courses.find(c => c.path == path).text
            })
        }

        courses
                .map(c => c.path).filter(p => p.substring(0, p.lastIndexOf('.')) == path).forEach(p => add(p))
    }

    add(courses[0].path)

    return {
        choices,
        pageSize: process.stdout.rows - 3
    }
}