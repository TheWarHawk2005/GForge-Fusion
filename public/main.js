// INDEX.JS
// compile all dependencies and resources

// import core scripts
import { gcore } from './core/gcore.js'
window.gcore = gcore
window.useAppearance = 'light'

// handle async data loading
export const dataLoaded = async function () {
    const response = await fetch('./manifest.json')
    const json = await response.json()
    window.manifest = json;

    return await Promise.all([
        fetch(json.dictionary)
            .then(response1 => response1.json())
            .then(dict => { window.dictionary = dict; }),
        fetch(json.web_styles)
            .then(response2 => response2.json())
            .then(styles => { window.webStyles = styles; }),
        fetch(json.command_styles)
            .then(response3 => response3.json())
            .then(cmdStyles => { window.commandStyles = cmdStyles; })
    ]);
}

//"#d7dae5ff"