import { dataLoaded } from './main.js';

dataLoaded().then(() => {
    /* ------------------------- Set up global functions ------------------------ */
    window.deleteCommandContext = deleteCommandContext
    window.copyCommandContext = copyCommandContext
    window.moveElementDown = moveElementDown
    window.moveElementUp = moveElementUp
    window.setCSSVariables = setCSSVariables
    window.toggleAppearance = toggleAppearance
    window.handleSmartIcons = handleSmartIcons

    const commandStyles = window.commandStyles


    /* ----------------------- Run functions on page load ----------------------- */
    const workbench = document.getElementById('workbench')
    const commandsContainer = document.getElementById('commands-container')
    const appearanceToggleImg = document.getElementById('appearance-toggle-img')
    appearanceToggleImg.src = `./assets/ui/appearance_${useAppearance}.png`

    setCSSVariables()

    var selectedElements = new Array()
    window.selectedElements = selectedElements


    /* ------------------------ Handle command generation ----------------------- */
    // populate toolbox
    dictionary.commands.forEach(entry => {
        const newToolboxElement = gcore.generateLabelElement(entry)
        newToolboxElement.onclick = function () { addToWorkbench(entry) }

        // styling command
        if (commandStyles && commandStyles.types[entry.type]) {
            const style = commandStyles.types[entry.type]
            newToolboxElement.style.backgroundColor = style.background_color
            newToolboxElement.style.color = style.color
            newToolboxElement.querySelector('.gcore-label-icon').src = `./assets/ui/commands/${style.icon}`
        } else { console.warn(`cannot find styling for type "${entry.type}"`) }

        document.getElementById('toolbox').appendChild(newToolboxElement)
    })

    function addToWorkbench(dictionaryDefinition, params, afterElement) {
        const reorderUpImg = './assets/ui/reorder_up.png'
        const reorderDownImg = './assets/ui/reorder_down.png'
        const deleteCommandImg = './assets/ui/delete_command.png'
        const copyCommandImg = './assets/ui/copy_command.png'
        const img = ''

        const commandContextUUID = crypto.randomUUID()
        const newContext = document.createElement('DIV')
        newContext.classList = 'command-container'
        newContext.id = commandContextUUID

        // left "reorder" div
        const newReorder = document.createElement('DIV')
        newReorder.classList = 'reorder-commands-container'
        newReorder.innerHTML = `
        <img src=${reorderUpImg} class="smart-icon" onclick="moveElementUp('${commandContextUUID}')">
        <img src=${reorderDownImg} class="smart-icon" onclick="moveElementDown('${commandContextUUID}')">`

        // main command- generate and style
        const newCommand = gcore.generateElement(dictionaryDefinition, params)

        // command actions- copy, delete, etc.
        const newActions = document.createElement('DIV')
        newActions.classList = 'command-context-actions'
        newActions.innerHTML = `
            <img src=${img}>
            <img class="copy-command-context smart-icon" onclick="copyCommandContext(['${commandContextUUID}'])" src=${copyCommandImg}>
            <img class="delete-command-context smart-icon" onclick="deleteCommandContext(['${commandContextUUID}'])" src=${deleteCommandImg}>`

        // tie it all together
        newContext.appendChild(newReorder)
        newContext.appendChild(newCommand)
        newContext.appendChild(newActions)

        // add event listeners
        newContext.addEventListener('click', event => {
            selectContext(commandContextUUID)
            event.stopPropagation()
        })

        if (afterElement) { // after element should be a DOM element
            afterElement.after(newContext)
        } else {
            commandsContainer.appendChild(newContext)
        }
        styleCommandContext(newContext, dictionaryDefinition.identifier)
        renderAllCodeOutput()
        return newContext // return element
    }

    /* ----------------------------- Event Listeners ---------------------------- */

    workbench.addEventListener('copy', event => {
        const tag = event.target.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
            event.preventDefault()
            if (selectedElements.length > 0) {
                copyCommandContext(selectedElements)
            }
        }
    })

    workbench.addEventListener('paste', event => {
        const tag = event.target.tagName.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
            event.preventDefault()
            pasteCommandContext(document.getElementById(selectedElements[selectedElements.length - 1]))
        }
    })

    workbench.addEventListener('click', event => {
        // deselect any selected commands
        selectContext('workbench')
    })

    workbench.addEventListener('keydown', event => {
        const target = event.target
        const tag = target.tagName.toLowerCase();
        if (event.key === 'Backspace') {
            if (tag !== 'input' && tag !== 'textarea') {
                deleteCommandContext(selectedElements)
            }
        }
    })

    workbench.addEventListener('focusout', function (event) {
        if (event.target.tagName.toLowerCase() === 'input') {
            renderAllCodeOutput()
        }
    });

    appearanceToggleImg.addEventListener('click', event => {
        console.log(useAppearance)
        toggleAppearance()
    })

    /* ------------------------- Command Context Actions ------------------------ */

    function moveElementUp(elementId) {
        const element = document.getElementById(elementId)
        if (element.previousElementSibling)
            element.parentNode.insertBefore(element, element.previousElementSibling);
    }

    function moveElementDown(elementId) {
        const element = document.getElementById(elementId)
        if (element.nextElementSibling)
            element.parentNode.insertBefore(element.nextElementSibling, element);
    }

    function deleteCommandContext(idArray) {
        idArray.forEach(elementId => {
            document.getElementById(elementId).remove()
        })
        selectedElements = []
        renderAllCodeOutput()
    }

    function copyCommandContext(idArray) {
        const shortformData = {
            "data_type": "shortform",
            "commands": []
        }
        idArray.forEach(elementId => {
            shortformData.commands.push(gcore.elementToShortformData(elementId)) //get shortform JSON definition for each Id
        })
        Clipboard = shortformData // copy array to clipboard
        console.log(shortformData)
    }

    function pasteCommandContext(afterElement) {
        var pasteData = Clipboard
        console.log(pasteData)
        if (pasteData.data_type && pasteData.data_type === 'shortform') {
            pasteData.commands.forEach(item => {
                afterElement = addToWorkbench( //* create NEW element from shortform data
                    dictionary.commands.find(cmd => cmd.identifier === item.identifier), // look up longform definition
                    item.params, // include any shortform parameters
                    afterElement
                )
            })
        }
    }

    function selectContext(elementId) {
        const element = document.getElementById(elementId)
        if (element) { // quick fix to prevent attempted selection after command deleted
            if (elementId === 'workbench') { // workbench clicked; deselect all commands
                document.querySelectorAll('.context-selected').forEach(element => {
                    element.classList.remove('context-selected')
                })
                selectedElements = []
            } else {
                const previouslySelected = element.classList.contains('context-selected')
                if (window.event.ctrlKey) { //ctrl was held down during click
                    if (previouslySelected === true) {
                        element.classList.remove('context-selected')
                        selectedElements = selectedElements.filter(e => e !== elementId); // remove element from array
                    } else {
                        document.getElementById(elementId).classList.add('context-selected')
                        selectedElements.push(elementId)
                        selectedElements = syncUuidOrder(selectedElements) // sort uuid order to match html regardless of selection order
                    }
                } else {
                    document.querySelectorAll('.context-selected').forEach(element => {
                        element.classList.remove('context-selected')
                    })
                    document.getElementById(elementId).classList.add('context-selected')
                    selectedElements = []
                    selectedElements.push(elementId)
                }
            }
        }
        outlineSelectedGroups()
    }

    function outlineSelectedGroups() {
        for (const element of document.querySelectorAll('.context-selected-top')) {
            element.classList.remove('context-selected-top')
        }
        for (const element of document.querySelectorAll('.context-selected-bottom')) {
            element.classList.remove('context-selected-bottom')
        }

        const items = Array.from(document.querySelectorAll('.context-selected'))

        for (let i = 0; i < items.length; i++) {
            const curr = items[i];
            const prev = items[i - 1];
            const next = items[i + 1];

            const isPrevSelected = prev && prev.classList.contains('context-selected') && prev.nextElementSibling === curr
            const isNextSelected = next && next.classList.contains('context-selected') && curr.nextElementSibling === next

            if (!isPrevSelected) {    // Only top if NOT preceded by another selected element
                curr.classList.add('context-selected-top')
            }
            if (!isNextSelected) {    // Only bottom if NOT followed by another selected element
                curr.classList.add('context-selected-bottom')
            }
        }
    }

    function syncUuidOrder(arr) {
        return arr
            .map(id => document.getElementById(id))
            .filter(Boolean)
            .sort((a, b) =>
                (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) ? 1 : -1
            )
            .map(el => el.id)
    }

    /* ----------------------------- Misc functions ----------------------------- */

    function toggleOutputDisplay() {
        const element = document.getElementById('output-display')
        const collapsed = element.dataset.collapsed
        collapsed == 'true' ? element.dataset.collapsed = 'false' : element.dataset.collapsed = 'true'
    }

    function toggleAppearance() {
        useAppearance == 'dark' ? useAppearance = 'light' : useAppearance = 'dark'
        appearanceToggleImg.src = `./assets/ui/appearance_${useAppearance}.png`
        setCSSVariables()
        handleSmartIcons()
    }

    function renderAllCodeOutput() {
        const container = document.getElementById('output-display-code-container')
        container.innerHTML = ''

        if (document.getElementById('output-display').dataset.collapsed !== 'true') {
            // get all commands
            document.querySelectorAll('.command-container').forEach(element => {
                const output = gcore.dataToCode(gcore.elementToShortformData(element.id), dictionary)
                const instructionElement = document.createElement('DIV')
                instructionElement.classList = 'raw-instruction'

                output.forEach(fragment => {
                    const fragmentElement = document.createElement('SPAN')
                    fragmentElement.classList = 'gcode-fragment'
                    fragmentElement.innerHTML = fragment
                    instructionElement.appendChild(fragmentElement)
                })
                if (instructionElement.outerText.length > 0)
                    container.appendChild(instructionElement)
            })
        }
    }

    function setCSSVariables() {
        const appearance = window.useAppearance || 'light'; // "light" or "dark"
        const bodyStyles = webStyles.body;

        for (const key in bodyStyles) {
            const value = bodyStyles[key];

            // If value is an object with light/dark keys
            if (
                typeof value === 'object' &&
                value !== null &&
                ('light' in value || 'dark' in value)
            ) {
                // Use current appearance
                document.documentElement.style.setProperty(`--${key.replace(/_/g, '-')}`, value[appearance]);
            }
            // If value is a direct string
            else {
                document.documentElement.style.setProperty(`--${key.replace(/_/g, '-')}`, value);
            }
        }

        document.querySelectorAll('.gcore-command').forEach(element => {
            styleCommandContext(element.parentElement, element.dataset.commandIdentifier)
        })
    }

    function styleCommandContext(element, commandIdentifier) {
        // set defaults
        element.style.setProperty('--this-background-color', commandStyles.default[useAppearance].background_color)
        element.style.setProperty('--this-text-color', commandStyles.default[useAppearance].color)

        // look for specific styling
        const dictionaryDefinition = dictionary.commands.find(cmd => cmd.identifier === commandIdentifier)
        var commandStyle
        if (commandStyles.commands[dictionaryDefinition.identifier] || commandStyles.types[dictionaryDefinition.type]) {
            if (commandStyles.commands[dictionaryDefinition.identifier]) {
                commandStyle = commandStyles.commands[dictionaryDefinition.identifier]
            } else if (commandStyles.types[dictionaryDefinition.type]) {
                commandStyle = commandStyles.types[dictionaryDefinition.type]
            }
            const style = (
                (useAppearance === "dark" && commandStyle?.dark) ||
                (useAppearance === "light" && commandStyle?.light) ||
                commandStyle
            )
            if ("background_color" in style) { element.style.setProperty('--this-background-color', style.background_color) }
            if ("color" in style) { element.style.setProperty('--this-text-color', style.color) }
        } else {
            console.warn(`cannot find styling for type "${dictionaryDefinition.identifier}"`)
        }
        handleSmartIcons()
    }

    function handleSmartIcons() {
        function luminance(color) {
            const rgb = color.map(function (c) {
                c /= 255 // to 0-1 range
                return c < 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
            })
            return (
                21.26 * rgb[0] + // red
                71.52 * rgb[1] + // green
                7.22 * rgb[2]
            ) // blue
        }

        function getRGBColor(colorStr) {
            // Normalize input
            if (typeof colorStr !== 'string') return null
            colorStr = colorStr.trim().toLowerCase()

            // RGB or RGBA format
            const rgbMatch = colorStr.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/)
            if (rgbMatch) {
                const [r, g, b] = rgbMatch.slice(1).map(Number)
                return [r, g, b]
            }

            // Hex format
            const hexMatch = colorStr.match(/^#([a-f0-9]{3}|[a-f0-9]{6})$/i)
            if (hexMatch) {
                let hex = hexMatch[1]
                if (hex.length === 3) {
                    hex = hex.split('').map(c => c + c).join('')
                }
                const r = parseInt(hex.substring(0, 2), 16)
                const g = parseInt(hex.substring(2, 4), 16)
                const b = parseInt(hex.substring(4, 6), 16)
                return [r, g, b]
            }

            // Named CSS color (use a dummy DOM element)
            const dummy = document.createElement('div')
            dummy.style.color = colorStr
            document.body.appendChild(dummy)

            const computedColor = getComputedStyle(dummy).color
            document.body.removeChild(dummy)

            const namedMatch = computedColor.match(/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/)
            if (namedMatch) {
                return namedMatch.slice(1).map(Number)
            }
            return null
        }

        function getNearestBackgroundColor(element) {
            while (element) {
                const bg = getComputedStyle(element).backgroundColor
                // Skip transparent backgrounds
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                    return bg
                }
                element = element.parentElement
            }
            return null // Nothing found
        }

        document.querySelectorAll('.smart-icon').forEach(element => {
            const bgColor = getNearestBackgroundColor(element)
            const testColor = getRGBColor(bgColor)
            if (luminance(testColor) > 30) {
                element.style.filter = `brightness(${0})`
            } else {
                element.style.filter = `brightness(${1})`
            }
        })
    }
})