const gcore = {
    version: '0.0.1',
    appearance: 'dark',

    _init: function () {
        console.log(gcore._colorLog([114, 165, 71], `Running gcore engine version ${this.version}`))
        console.log(gcore._colorLog([114, 165, 71], `Imported dictionary version ${dictionary.version}`))
    },

    //* GENERATE ELEMENT: returns an HTML element made from a dictionary entry.
    generateElement: function (commandDefinition, optionalParams) {
        // Validate parameters
        if (!commandDefinition || !typeof commandDefinition === 'object') { throw new TypeError('gcore.generateElement: command definition must be an object.') }
        if (!commandDefinition.web_template) { throw new TypeError('gcore.generateElement: command definition must include web_template') }
        if (!typeof optionalParams === 'object') { throw new TypeError('gcore.generateElement: parameters must be an object') }

        // create HTML element
        const webTemplate = commandDefinition.web_template
        let divElement = document.createElement('DIV')
        divElement.classList = 'gcore-command'
        divElement.dataset.commandType = commandDefinition.type
        divElement.dataset.commandIdentifier = commandDefinition.identifier

        webTemplate.forEach(item => {
            let lineContainer = document.createElement('LABEL') // One line per template string
            lineContainer.classList = 'gcore-command-section'

            item.split(/(\{\w+\})/g).forEach(part => {
                let match = part.match(/^\{(\w+)\}$/)
                if (match) {
                    lineContainer.classList.add('includes-input')
                    const key = match[1]
                    if (commandDefinition.params[key].type == 'number' || commandDefinition.params[key].type == 'text') {
                        let inputMirrorElement = document.createElement('SPAN')
                        inputMirrorElement.classList = 'gcore-command-input-mirror'
                        inputMirrorElement.textContent = ' ' // Prevent width = 0 on load

                        let inputElement = document.createElement('INPUT')
                        inputElement.type = commandDefinition.params[key].type
                        inputElement.classList = 'gcore-command-input'
                        inputElement.dataset.linkedParam = key
                        if (optionalParams && optionalParams[key]) { inputElement.value = optionalParams[key] } // if pasting or rendering an existing command, fill input values

                        function resizeToFit() {
                            inputMirrorElement.textContent = inputElement.value || ' '
                            inputElement.style.width = `calc(${inputMirrorElement.offsetWidth}px + 3em)`
                        }

                        // Set up resizing behavior
                        inputElement.addEventListener('input', resizeToFit)
                        inputElement.addEventListener('keydown', event => { if (event.key === 'Enter') event.target.blur() })
                        lineContainer.appendChild(inputElement)
                        lineContainer.appendChild(inputMirrorElement)
                        requestAnimationFrame(resizeToFit)
                    } else if (commandDefinition.params[key].type == 'choice') {
                        const inputElement = document.createElement('SELECT')
                        inputElement.classList = 'gcore-command-input'
                        inputElement.dataset.linkedParam = key
                        const options = commandDefinition.params[key].options
                        options.forEach(option => {
                            const optionElement = document.createElement('OPTION')
                            optionElement.value = option.value
                            optionElement.innerHTML = option.label
                            if (optionalParams && optionalParams[key] && (optionalParams[key] === option.value)) { optionElement.selected = true } // if pasting or rendering an existing command, auto-select option
                            inputElement.appendChild(optionElement)
                        })
                        lineContainer.appendChild(inputElement)
                    }

                } else if (part !== undefined) {
                    lineContainer.appendChild(document.createTextNode(part))
                }
            })
            divElement.appendChild(lineContainer)
        });
        return divElement
    },

    //* GENERATE LABEL ELEMENT: returns an element with a simple non-editable label
    generateLabelElement: function (commandDefinition) {
        if (!commandDefinition || !typeof commandDefinition === 'object') { throw new TypeError('gcore.generateLabelElement: command definition must be an object.') }
        if (!commandDefinition.label) { throw new TypeError('gcore.generateLabelElement: command definition must include web_template') }

        const label = commandDefinition.label
        let divElement = document.createElement('DIV')
        divElement.classList = 'gcore-label'
        divElement.dataset.commandType = commandDefinition.type

        let iconElement = document.createElement('IMG')
        iconElement.classList = 'gcore-label-icon smart-icon'

        let spanElement = document.createElement('SPAN')
        spanElement.classList = 'gcore-label-text'

        spanElement.innerHTML = label
        divElement.appendChild(iconElement)
        divElement.appendChild(spanElement)

        return divElement
    },

    getRawOutput: function (outputTemplate, paramsObj) {
        const params = paramsObj
        const arr = outputTemplate
        return arr.flatMap(item => {
            const match = item.match(/{(\w+)}/)
            if (match) {
                const key = match[1]
                // Only include if param exists and is not empty string
                return key in params && params[key] !== "" ? item.replace(/{\w+}/g, params[key]) : []
            }
            return item;
        })
    },

    dataToCode: function (shortformData, dictionary) {
        const identifier = shortformData.identifier
        const paramsObj = shortformData.params
        const dictionaryObj = dictionary
        const commandObj = dictionary.commands.find(cmd => cmd.identifier === identifier)
        if (commandObj) {
            return this.getRawOutput(commandObj.output, paramsObj)
        } else {
            console.error(`gcore: cannot find command "${commandIdentifier}" in dictionary`)
        }
    },

    elementToShortformData: function (commandContextUUID) {
        const element = document.getElementById(commandContextUUID)
        const commandElement = element.querySelector('.gcore-command')
        const params = new Object()
        commandElement.querySelectorAll(`.gcore-command-input`).forEach(input => {
            const linkedParam = input.dataset.linkedParam
            params[linkedParam] = input.value.toString()
        })
        const newData = {
            "identifier": commandElement.dataset.commandIdentifier,
            "params": params,
        }
        return newData
    },

    _colorLog: function (color, log, bg) {
        var _colorCode
        var _textOrBg
        if (Array.isArray(color)) {
            _colorCode = `${color[0]};${color[1]};${color[2]}`
        } else { _colorCode = color }

        if (bg && bg === true) {
            _textOrBg = '48;2'
        } else {
            _textOrBg = '38;2'
        }
        return `\x1B[${_textOrBg};${_colorCode}m${log}`
    }
}

// gcore._init()
export { gcore }