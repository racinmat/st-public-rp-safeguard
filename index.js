// The main script for the extension
// The following are examples of some basic extension functionality

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import { extension_settings } from '../../../extensions.js';

//You'll likely need to import some other functions from the main script
import { doTogglePanels, saveSettingsDebounced } from '../../../../script.js';
import { parser, setRegisterSlashCommand } from '../../../slash-commands.js';

// Keep track of where your extension is located, name should match repo name
const extensionName = 'st-public-rp-safeguard';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {};


// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
    //Create the settings if they don't exist
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (Object.keys(extension_settings[extensionName]).length === 0) {
        Object.assign(extension_settings[extensionName], defaultSettings);
    }

    // Updating settings in the UI
    $('#rp-safeguard-disable-commands').prop('checked', extension_settings[extensionName].disable_slash_commands).trigger('input');
    $('#rp-safeguard-hide-panels').prop('checked', extension_settings[extensionName].hide_panels).trigger('input');
}

// This function is called when the extension settings are changed in the UI
function onDisableSlashCommands(event) {
    extension_settings[extensionName].disable_slash_commands = Boolean($(event.target).prop('checked'));
    saveSettingsDebounced();
}

// This function is called when the extension settings are changed in the UI
function onHidePanels(event) {
    extension_settings[extensionName].hide_panels = Boolean($(event.target).prop('checked'));
    saveSettingsDebounced();
}

function dummyAddCommand(command, callback, aliases, helpString = '', interruptsGeneration = false, purgeFromMessage = true) {
    console.log('Command disabled because the disabling slash commands in st-public-rp-safeguard extension is on:', command, callback, aliases, helpString, interruptsGeneration, purgeFromMessage);
}


function applySettings() {
    if (extension_settings[extensionName].disable_slash_commands) {
        console.log('Disabling slash commands');
        parser.commands = {};
        // some commands are added dynamically after this point, even if this extensions is loaded as the last one,
        // so we overwrite it by empty commands adding
        // assign it a lambda with following signature addCommand(command, callback, aliases, helpString = '', interruptsGeneration = false, purgeFromMessage = true)
        parser.addCommand = dummyAddCommand;
        // need to rewrite the following functions, because otherwise they keep the reference to the original ones
        setRegisterSlashCommand(dummyAddCommand);
    }
    if (extension_settings[extensionName].hide_panels) {
        doTogglePanels();
    }
}

// This function is called when the extension is loaded
jQuery(async () => {
    // This is an example of loading HTML from a file
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);

    // Append settingsHtml to extensions_settings
    // extension_settings and extensions_settings2 are the left and right columns of the settings menu
    // Left should be extensions that deal with system functions and right should be visual/UI related
    $('#extensions_settings').append(settingsHtml);

    // These are examples of listening for events
    $('#rp-safeguard-disable-commands').on('input', onDisableSlashCommands);
    $('#rp-safeguard-hide-panels').on('input', onHidePanels);

    // Load settings when starting things up (if you have any)
    loadSettings();
    // this must run after all other extensions have finished loading, otherwise their commands will be present
    applySettings();
});
