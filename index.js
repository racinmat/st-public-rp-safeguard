// The main script for the extension
// The following are examples of some basic extension functionality

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import {extension_settings, getConfigValues} from '../../../extensions.js';

//You'll likely need to import some other functions from the main script
import {doTogglePanels, saveSettingsDebounced, DEFAULT_SAVE_EDIT_TIMEOUT, doNewChat, event_types, eventSource} from '../../../../script.js';
import {SlashCommandParser} from "../../../../scripts/slash-commands/SlashCommandParser.js";
// import {parser, setRegisterSlashCommand} from '../../../slash-commands.js';

// Keep track of where your extension is located, name should match repo name
const extensionName = 'st-public-rp-safeguard';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const defaultSettings = {};


// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
    //try to load settings from config like this
    console.debug("loading settings for", extensionName);
    let ext_settings = extension_settings[extensionName] || {};
    let settings_keys = Object.keys(ext_settings);
    if (settings_keys.length === 0) {
        Object.assign(ext_settings, defaultSettings);
    }
    console.debug("loading settings for", settings_keys, "in", extensionName);
    // dict comprehension
    settings_keys = settings_keys.map(key => ({ key: key, typeConverter: 'boolean' }));

    const extension_server_config = await getConfigValues(extensionName, settings_keys);
    console.debug('extension_server_config:', extension_server_config);

    // server config to extension settings
    for (const key in ext_settings) {
        if (extension_server_config[key] !== undefined) {
            ext_settings[key] = extension_server_config[key];
        }
    }
    console.debug('extension_settings:', ext_settings);

    // Updating settings in the UI
    $('#rp-safeguard-disable-commands').prop('checked', ext_settings.disable_slash_commands).trigger('input');
    $('#rp-safeguard-hide-panels').prop('checked', ext_settings.hide_panels).trigger('input');
    $('#rp-safeguard-add-reset-button').prop('checked', ext_settings.add_reset_button).trigger('input');
    $('#rp-safeguard-hide-menus').prop('checked', ext_settings.hide_menus).trigger('input');
    $('#rp-safeguard-restart-idle-chat').prop('checked', ext_settings.restart_idle_chat).trigger('input');
    $('#rp-safeguard-ui-language').val(ext_settings.ui_language).trigger('input');
}

function onDisableSlashCommands(event) {
    extension_settings[extensionName].disable_slash_commands = Boolean($(event.target).prop('checked'));
    saveSettingsDebounced();
}

function onHidePanels(event) {
    extension_settings[extensionName].hide_panels = Boolean($(event.target).prop('checked'));
    saveSettingsDebounced();
}

function onAddResetButton(event) {
    extension_settings[extensionName].add_reset_button = Boolean($(event.target).prop('checked'));
    saveSettingsDebounced();
}

function onHideMenus(event) {
    extension_settings[extensionName].hide_menus = Boolean($(event.target).prop('checked'));
    saveSettingsDebounced();
}

function onRestartIdleChat(event) {
    extension_settings[extensionName].restart_idle_chat = Boolean($(event.target).prop('checked'));
    saveSettingsDebounced();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setUILanguage(language) {
    // taken from i18n.js
    const currentLanguage = localStorage.getItem('language');
    // because this code runs on startup, we need to stop the recursion
    if (language !== currentLanguage) {
        console.log("changing the language from", currentLanguage, "to", language);
        if (language) {
            localStorage.setItem('language', language);
        } else {
            localStorage.removeItem('language');
        }
        location.reload();
    }
}

async function onChangeUILanguage(event) {
    const language = String($('#rp-safeguard-ui-language').val());
    console.log("set language:", language)
    extension_settings[extensionName].ui_language = language;
    saveSettingsDebounced();
    // wait asynchronously
    await delay(DEFAULT_SAVE_EDIT_TIMEOUT); // apparently we need to wait, otherwise it does not get stored, https://github.com/SillyTavern/SillyTavern/compare/1.12.1...1.12.2
    setUILanguage(language);
}

function dummyAddCommand(command, callback, aliases, helpString = '', interruptsGeneration = false, purgeFromMessage = true) {
    console.log('Command disabled because the disabling slash commands in st-public-rp-safeguard extension is on:', command, callback, aliases, helpString, interruptsGeneration, purgeFromMessage);
}


// functionality for resetting chat after some time of inactivity
let timeoutId;

function doNewChatWithLog() {
    console.log("doNewChat function is being called");
    doNewChat();
}

function resetTimer() {
    // Clear the existing timeout
    if (timeoutId) {
        clearTimeout(timeoutId);
    }
    const minutes = 5;
    // Set a new timeout

    timeoutId = setTimeout(doNewChatWithLog, minutes * 60 * 1000); // 5 minutes
}

async function applySettings() {
    if (extension_settings[extensionName].disable_slash_commands) {
        console.log('Disabling slash commands');

        // Clear existing commands
        if (SlashCommandParser && SlashCommandParser.commands) {
            console.log('Clearing existing slash commands');
            SlashCommandParser.commands = {};
            SlashCommandParser.helpStrings = {};
        }

        // Replace addCommandObject function with our own dummy version
        if (SlashCommandParser && SlashCommandParser.addCommandObject) {
            console.log('Replacing SlashCommandParser.addCommandObject with dummy function');
            // Store the original function if needed later
            if (!SlashCommandParser._originalAddCommandObject) {
                SlashCommandParser._originalAddCommandObject = SlashCommandParser.addCommandObject;
            }
            // Replace with dummy function that logs but doesn't add commands
            SlashCommandParser.addCommandObject = function(commandObj) {
                console.log('Command blocked by st-public-rp-safeguard:', commandObj.name);
                return false;
            };
        }
    }

    if (extension_settings[extensionName].hide_panels) {
        doTogglePanels();
    }
    if (extension_settings[extensionName].add_reset_button) {
        const restartChatHtml = await $.get(`${extensionFolderPath}/restart_chat.html`);
        $('#leftSendForm').append(restartChatHtml);
        // button for restarting chat
        $('#option_start_new_chat2').on('click', () => {
            doNewChatWithLog();    // annoying popup blicks, discuss if it's a problem
        });
    }
    if (extension_settings[extensionName].hide_menus) {
        // Apply CSS styles to #extensionsMenuButton
        $('#extensionsMenuButton').css('display', 'none');

        // Apply CSS styles to #options_button
        $('#options_button').css('display', 'none');

        // Apply CSS styles to .mes .mes_edit
        $('.mes .mes_edit').css('display', 'none');

        // Apply CSS styles to .mes .extraMesButtonsHint
        $('.mes .extraMesButtonsHint').css('display', 'none');
    }
    if (extension_settings[extensionName].restart_idle_chat) {
        // Call resetTimer right away to start the timer
        console.log('Starting idle chat timer')
        resetTimer();

        // Whenever there's activity, reset the timer
        // window.addEventListener('mousemove', resetTimer);
        window.addEventListener('mousedown', resetTimer);
        window.addEventListener('keypress', resetTimer);
        // window.addEventListener('touchmove', resetTimer);
    }
    if (extension_settings[extensionName].ui_language) {
        setUILanguage(extension_settings[extensionName].ui_language);
    }
}

// This function is called when the extension is loaded
jQuery(async () => {
    // Adding new options to the settings menu
    const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);

    // Append settingsHtml to extensions_settings
    // extension_settings and extensions_settings2 are the left and right columns of the settings menu
    // Left should be extensions that deal with system functions and right should be visual/UI related
    $('#extensions_settings').append(settingsHtml);

    // These are examples of listening for events
    $('#rp-safeguard-disable-commands').on('input', onDisableSlashCommands);
    $('#rp-safeguard-hide-panels').on('input', onHidePanels);
    $('#rp-safeguard-add-reset-button').on('input', onAddResetButton);
    $('#rp-safeguard-hide-menus').on('input', onHideMenus);
    $('#rp-safeguard-restart-idle-chat').on('input', onRestartIdleChat);
    $('#rp-safeguard-ui-language-button').on('click', onChangeUILanguage);

    // Load settings when starting things up (if you have any)
    await loadSettings();
    // this must run after all other extensions have finished loading, otherwise their commands will be present
    await applySettings();
    eventSource.on(event_types.TEXT_COMPLETION_SETTINGS_READY, async (name) => {
        console.debug('emitted TEXT_COMPLETION_SETTINGS_READY:', name);
    });
    eventSource.on(event_types.GENERATE_BEFORE_COMBINE_PROMPTS, async (name) => {
        console.debug('emitted GENERATE_BEFORE_COMBINE_PROMPTS:', name);
    });
    eventSource.on(event_types.GENERATE_AFTER_COMBINE_PROMPTS, async (name) => {
        console.debug('emitted GENERATE_AFTER_COMBINE_PROMPTS:', name);
    });
    eventSource.on(event_types.GENERATE_AFTER_DATA, async (name) => {
        console.debug('emitted GENERATE_AFTER_DATA:', name);
    });
});
