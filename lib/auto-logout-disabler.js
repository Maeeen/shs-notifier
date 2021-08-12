// Auto-logout disabler
module.exports = disable_auto_logout = async ({ token, auto_logout_date }) => {
    let time = auto_logout_date - Date.now()

    setTimeout(async () => {
        let { logout_delay } = await connect_isa.fetch_home(ISA_ADDR, token)
        disable_auto_logout({ token, auto_logout_date: new Date(Date.now() + logout_delay )})
    }, time)
}