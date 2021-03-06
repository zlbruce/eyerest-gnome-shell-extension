const St = imports.gi.St;
const Main = imports.ui.main;
const Tweener = imports.ui.tweener;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const MessageTray = imports.ui.messageTray;
const GLib = imports.gi.GLib;
const Shell = imports.gi.Shell;

const Gettext = imports.gettext.domain('gnome-shell-extensions-eyerest');
const _ = Gettext.gettext;
const N_ = function(t) { return t };


const Me = imports.misc.extensionUtils.getCurrentExtension();
const dbus_interface = Me.imports.dbus;
const Util = Me.imports.util;

let eye_button;
let settings;

function convertDateToUTC(date) { return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()); }

const eyerest_button = new Lang.Class({
    Name: 'eyerest_button',
    Extends: PanelMenu.Button,

    _init : function() 
    {
        this.parent(0.0, 'Eyerest');

        this._label = new St.Label({ style_class: 'panel-label', text: "Eyerest" });
        this.actor.add_actor(this._label);

        // 添加菜单
        this._state_title = new PopupMenu.PopupMenuItem(_("State: "), { reactive: false });
        this._delay3_menu = new PopupMenu.PopupMenuItem(_("delay 3 min"));
        this._delay5_menu = new PopupMenu.PopupMenuItem(_("delay 5 min"));

        this._pause_menu = new PopupMenu.PopupMenuItem(_("pause"));
        this._continue_menu = new PopupMenu.PopupMenuItem(_("continue"));

        this._rest_now_menu = new PopupMenu.PopupMenuItem(_("rest now"));

        this._pref_menu = new PopupMenu.PopupMenuItem(_("Preferences..."));

        this.menu.addMenuItem(this._state_title);

        this.menu.addMenuItem(this._delay3_menu);
        this.menu.addMenuItem(this._delay5_menu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this.menu.addMenuItem(this._pause_menu);
        this.menu.addMenuItem(this._continue_menu);
        this.menu.addMenuItem(this._rest_now_menu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addMenuItem(this._pref_menu);

        // 菜单事件
        this._delay3_menu_sid = this._delay3_menu.connect('activate', Lang.bind(this, this._delay_seconds, 180));
        this._delay5_menu_sid = this._delay5_menu.connect('activate', Lang.bind(this, this._delay_seconds, 300));
        this._pause_menu_sid = this._pause_menu.connect('activate', Lang.bind(this, function()
            {
                this._eyerest_proxy.pauseRemote();
            }));
        this._continue_menu_sid = this._continue_menu.connect('activate', Lang.bind(this, function()
            {
                this._eyerest_proxy.unpauseRemote();
            }));
        this._rest_now_menu_sid = this._rest_now_menu.connect('activate', Lang.bind(this, function()
            {
                this._eyerest_proxy.rest_nowRemote();
            }));

        // Dbus
        this._eyerest_proxy = dbus_interface.eyerest_dbus();
        this._eyerest_proxy_sid = this._eyerest_proxy.connectSignal('status', Lang.bind(this, this._on_status_change));

        this._gsmPrefs = Shell.AppSystem.get_default().lookup_app('gnome-shell-extension-prefs.desktop');

        this._pref_menu_sid = this._pref_menu.connect('activate', Lang.bind(this, function () 
            {
                if (this._gsmPrefs.get_state() == this._gsmPrefs.SHELL_APP_STATE_RUNNING){
                    this._gsmPrefs.activate();
                } else {
                    let info = this._gsmPrefs.get_app_info();
                    let timestamp = global.display.get_current_time_roundtrip();

                    info.launch_uris([Me.metadata.uuid], global.create_app_launch_context(timestamp, -1));
                }
            }));

    },

    _on_status_change : function(proxy, sender, [time_remain, st])
    {
        // 格式化字符串
        let tm = new Date(time_remain * 1000);
        let tm_utc = convertDateToUTC(tm);
        let tm_string = tm_utc.toLocaleFormat(settings.get_string('formatstring'));
        this._label.text = tm_string;
        this._state_title.label.text = _("State: ") + st;
    },

    _delay_seconds: function(menuItem, event, sec)
    {
        this._eyerest_proxy.delayRemote(sec);
    },

    destroy: function()
    {

        if (this._delay3_menu_sid)
        {
            this._delay3_menu.disconnect(this._delay3_menu_sid);
        }

        if (this._delay5_menu_sid)
        {
            this._delay5_menu.disconnect(this._delay5_menu_sid);
        }

        if (this._pause_menu_sid)
        {
            this._pause_menu.disconnect(this._pause_menu_sid);
        }

        if (this._continue_menu_sid)
        {
            this._continue_menu.disconnect(this._continue_menu_sid);
        }

        if (this._rest_now_menu_sid)
        {
            this._rest_now_menu.disconnect(this._rest_now_menu_sid);
        }

        if (this._pref_menu_sid)
        {
            this._pref_menu.disconnect(this._pref_menu_sid);
        }

        if (this._eyerest_proxy_sid)
        {
            this._eyerest_proxy.disconnectSignal(this._eyerest_proxy_sid);
        }

        this.parent();
    },

});



function init() 
{
    Util.initTranslations(Me);
    settings = Util.getSettings(Me);
}

function enable() {
    eye_button = new eyerest_button();
    Main.panel.addToStatusArea('eyerest', eye_button);
}

function disable() {
    eye_button.destroy();
    eye_button = null;
}
