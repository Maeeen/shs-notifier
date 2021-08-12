const https = require('https')
const { parse } = require('node-html-parser')
const parseCells = require('./parse-cells')
const { decode: decodeHtmlEntities } = require('html-entities')

let self = module.exports = {

    do_req: (url, token, headers = {}) => {
        return new Promise((res, rej) => {
            let page_content = ''

            https.request(url, {headers: {...headers, 'Cookie': `ISA-CNXKEY=${token}`}}, resp => {
                if (resp.statusCode != 200)
                    return rej('invalid cookie')

                resp.setEncoding('binary')

                resp.on('data', d => page_content += d)
                resp.on('end', () => res(page_content))
            }).end()
        })
    },

    fetch_home: async (isa, token) => {
        const ENDPOINT = 'PORTAL14S.htm'

        const page_content = await self.do_req(`${isa}/${ENDPOINT}`, token)
        
        if (page_content.length == 0)
            return rej('unexpected empty page')

        let html = parse(page_content)

        const username = html.querySelector('#logoutlogin-username').getAttribute('value')
        const logout_delay = parseInt(html.querySelector('#logout-lockpage').getAttribute('delay'))

        const cells = parseCells(Array.from(html.querySelector('div#main').childNodes))
        
        let registerCells = cells.filter(element => element.xslpath == 'Gestac.Moniteur.Portals.Inscrplans.celluleInscription')

        if (registerCells.length == 0)
            return rej('can not find register cell')

        return { username, logout_delay, course_reg_url: registerCells[0].xmlurl }
    },

    fetch_div_content: async (isa, token) => {
        const ENDPOINT = 'PORTAL14S.divContent'

        const page_content = await self.do_req(`${isa}/${ENDPOINT}`, token)

        let xml = parse(page_content)
        let group_name = xml.querySelector('uniteid').getAttribute('libelle')
        let person_name = xml.querySelector('user').getAttribute('signature')
        return { group_name, person_name }
    },

    fetch_courses: async (isa, token, endpoint) => {
        const page_content = await self.do_req(`${isa}/${endpoint}`, token)
        const xml = parse(page_content)
        const items = xml.querySelectorAll('plan > itemplan')

        let returnObj = {}

        // line 1147 of the linked xls file:
        // <xsl:if test="($mode='readOnly') or ($mode='unCheckOnly' and $data='non inscrit') or ($mode='unCheckOnly' and $data='inscrit' and $donnees='oui')">
        let isDisabled = element => {
            if (element == null) return

            let mode = element.querySelector('mode').innerText,
                data = element.querySelector('x_data').innerText,
                donnees = element.querySelector('donnees').innerText

            return mode == 'readonly' ||
                (mode == 'unCheckOnly' && data == 'non inscrit') ||
                (mode == 'unCheckOnly' && data == 'inscrit' && donnees == 'oui')
        } 

        items.forEach(element => {
            const id = element.querySelector('i_matiere').innerText,
                isCourse = element.getAttribute('b_matiere') != '0'

            returnObj[id] = {
                path: element.querySelector('x_chemin').innerText,
                id,
                text: decodeHtmlEntities(element.querySelector('libelle').innerText),
                isCourse,
                level: parseInt(element.getAttribute('level')),
                isAvailable: isCourse ? !isDisabled(element.querySelector('affichage-plans-inscr-bin > plangps')) : false
            }
        })

        return returnObj
    }
}