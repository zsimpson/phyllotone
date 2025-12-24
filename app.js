import { z } from './zscript.js'
import { z_app } from './z_app.js'

async function start_app() {
    let app_el

    // Global keys
    // --------------------------------------------------------------------------------

    window.addEventListener("keydown", (event) => {
        if( event.key === "Escape") {
            z("$#alerts").replaceChildren()
        }
    })

    // Start the z_app and wait for it to finish
    // --------------------------------------------------------------------------------

    return new Promise((resolve, reject) => {
        try {
            app_el = z_app()
            app_el.startup()
            window.addEventListener("_app_quit", () => {
                resolve()
            })
        }
        catch (err) {
            console.error(err)
            reject(err)
        }
    })
}

(async function () {
    // Setup error handling
    // --------------------------------------------------------------------------------

    // window.onerror = function (message, source, lineno, colno, error) {
    //     add_error(`${message} ${source}:${lineno}:${colno}`)
    //     return true
    // }

    // window.onunhandledrejection = function (event) {
    //     if(event?.reason?.message) {
    //         add_error(event.reason.message)
    //     }
    //     else {
    //         add_error(event.reason)
    //     }
    //     return true
    // }

    // const orig_assert = console.assert
    // console.assert = (condition, message, ...data) => {
    //     if (!condition) {
    //         // Create a new Error to capture the stack
    //         const error = new Error("Assertion failed")
    //         const error_msg = `${error.message}: ${message || "No message provided"} - ${error.stack}`
    //         add_error(error_msg)
    //         // Sometimes it is handy to lock up to debug errors in asyncs
    //         // while(1) { }
    //     }
    //     orig_assert.apply(console, [condition, ...data])
    // }

    // Config
    // --------------------------------------------------------------------------------

    // Start
    // --------------------------------------------------------------------------------

    // Without this delay, when the app starts I will often miss any de-bugger statements
    // This delay could be removed except in developer mode.
    // Still needed?
    // await delay(400)

    // await load_cutc_wasm()
    await start_app()
})()
