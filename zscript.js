/*

ABOUT
-----

    A single function HTML/ES6 Swiss-Army-Knife by Zack Booth Simpson.
    2022 License: MIT
    Inspired by hyperscript https://github.com/hyperhype/hyperscript with a hint of jquery.

EXAMPLES
--------

    // Create a new div with id "myid" and class "someclass"
    // under the existing body node and attach an onclick handler
    z($body",
        z("div#myid.someclass", "foo", {
            onclick: ()=> {
                console.log("Got a click");
            }
        })
     )

    // Reference a single node
    z("$#myid").classList.add("someotherclass")

    // Reference a list of nodes
    z("@.someclass").map( (el)=>{ el.classList.add("someotherclass") } )


USAGE
-----

    If the first argument is...
        like: "tag#id.class1.class2"
            This is "new tag form".
            A new node of tag is created with the id and classes

        has no tag: ".class1.class2"
            Then a "group" is created wherein all children will have these classes.
            A group is not a real HTML container but rather just a collection
            of nodes that all receive the same classes

        like: "$#id"
            Then the parent is assumed to exist and is queried by the string and
            will have all of its children removed.

        like: "@.some-selector"
            Then returns an array of the matching DOM objects and you
            may not add any children

        like: "^name"
            A generator. If the second argument is a function
            then it binds that function to the given name and invokes it.
            Otherwise it invokes it, replacing the singleton existing
            node with the new node returned by the geneator function.

        Is an HTMLElement
            Then it is assumed to be the parent object and will have all of its children removed.

    The following args are treated uniquely by type:
        If arg is an string then it is assumed to be a new text node
            z("div", "This is my test node")

        If it is an HTMLElement then it is a added as a child
            z("div",
                z("span", "a"),
                z("span", b)
            )

        If it is an object then then it specifies attributes attached to the parent
            z("button", "Press me", { disabled:true })

            Any attribute that is a function that starts with the string "on" is
            wrapped with a closure to easily turn it into an event handler:
                z("button", "Press me", {
                    onclick: (e)=>{
                        console.log("e")
                    }
                })

            Any attribute called "data" will be converted into HTML dataset property:
                z("button#my-button", {
                    data: {
                        foo: 1,
                        bar: 2
                    }
                })
                // document.getElementById("my-button").dataset.foo == 1

            Attribute called "style" will be converted into styles
            by converting underscore names to "-" for css properties
                z("button", {
                    style: {
                        background_color: "red",  // Converts underscore to dashes: ie 'background-color'
                    }
                })
                // document.getElementById("my-button").dataset.foo == 1

        If it is an array then each element of that list is added as a child nodes
        which is useful to to add children from maps:
            z("div",
                ["a", "b", "c"].map(
                    (i)=>{return z("span", i)}
                )
            )

        If it is a function then it is called as a transform over the existing children.
        This can be handy for DRYing defaults:
            z("div.btn-group",
                z("button", "One"),
                z("button", "Two"),
                z("button", "Three"),
                (i)=>{ i.disabled = true }
            )

    Sometimes you need to add element to an existing node. Use z_append()
    (See also z_mixin)
        let my_div = z("div")
        z_append(my_div, {
            a_new_method: ()=>{
                console.log("I'm a new method")
            }
        })

COMMON PATTERNS
---------------

    * Map children nodes:
        let names = ["a", "b", "c"]
        z("div.container",
            names.map((i)=>{ return z("span", i) })
        )

    * Wrap a group:
        z("div.btn-group",
            z(".btn.btn-primary",  // The children will each get the .btn.btn-primary classes
                z("button", "One"),
                z("button", "Two"),
            )
        )

    * Wrap a group with a function:
        function z_button_group(...children) {
            return z(
                "div.btn-group", { role: "group" },
                ...children,
                (button) => {
                    button.classList.add("btn", "btn-primary");
                }
            );
        }

        z(
            z_button_group(
                z("button", "One"),
                z("button", "Two"),
                )
        )

    * Use as a list selector
        z("@.some-class").map( (el) => { el.disabled = true } )

    * Create a component with private methods:
        function z_label_desc(label_text) {
            // Note how these are used as assignments and references
            let z_height, z_hidden
            return z(
                "div",
                z("label.form-label.float-end", label_text),
                z_height=z("input", { type: "text" }),  // Tricky
                z_hidden=z("input", { type: "checkbox" }),  // Tricky
                {
                    // These become methods of the returned object.
                    // Note the references to z_height and z_hidden
                    get_state: () => {
                        return {
                            height:parseFloat(z_height.value),
                            hidden:z_hidden.checked
                        }
                    },
                    set_hidden: (hidden) => {
                        z_hidden.checked = hidden
                    },
                }
            );
        }

        let layer_1, layer_2
        z("$body",
            z("div",
                layer_1=z_layer_desc("layer 1"),
                layer_2=z_layer_desc("layer 2"),
                z("button", "show state", {
                    onclick: ()=>{
                        // Calling the get_state() method
                        console.log("state is", layer_1.get_state(), layer_2.get_state())
                    }
                }),
                z("button", "set state", {
                    onclick: ()=>{
                        // Calling the set_hidden() method
                        layer_1.set_hidden(true)
                    }
                }),
            )
        );

*/

export function z_append(parent) {
    // Modifes a element. Example:
    // z_append(self, {...})
    // Note that this takes any number of arguments just like z()

    // When called by a user, the parent will be a single node but when called by the z() function
    // then it will be a list of [parent, is_group, is_query]

    let is_group = false
    let is_query = false
    if (Array.isArray(parent)) {
        is_group = parent[1]
        is_query = parent[2]
        parent = parent[0]
    }

    let children = []
    for (let i = 1; i < arguments.length; i++) {
        let a = arguments[i]
        if (typeof a === "string") {
            // Strings are text nodes except the first argument!
            // Do not create text nodes on empty strings
            if (a !== "") {
                children.push(document.createTextNode(a));
            }
        }
        else if (typeof a === "number") {
            children.push(document.createTextNode(a.toString()))
        }
        else if (a instanceof _z_classes) {
            // Handy way to add multiple classes
            a.classes.map((cls) => {
                if(typeof cls === "string" && cls !== "") {
                    parent.classList.add(cls)
                }
            })
        }
        else if (a instanceof HTMLElement) {
            // Typically this is the result os using a z() inside of a z()
            // Like z("div", z("button", "first"), z("button", "second"))
            // But there might be no parent in the case of a group
            children.push(a)
        }
        else if (a instanceof Array) {
            // Arrays are usually the result of a map like:
            //   z("div", names.map((name)=>z("span", name)))
            // but can also be the result of a group like:
            //   z(".btn", z("button", "one"), z("button", "two"))

            // TODO: Flatten lists
            // function flatten(arr) {
            //     const result = []
            //     function _flatten(item) {
            //         if (Array.isArray(item)) {
            //             item.forEach(_flatten)
            //         }
            //         else if (item !== undefined) {
            //             result.push(item)
            //         }
            //     }
            //     arr.forEach(_flatten)
            //     return result
            // }
            // let f = flatten(a)
            // children.push(f)

            for (let j = 0; j < a.length; j++) {
                if (typeof a[j] !== "undefined") {
                    children.push(a[j])
                }
            }
        }
        else if (a instanceof Object) {
            // Add node attributes.
            // Functions that are assigned to "on" are wrapped as event handlers
            // And "data" are treated as HTML dataset key/values
            for (let key in a) {
                if (a.hasOwnProperty(key)) {
                    if (typeof a[key] === "function") {
                        const func = a[key]
                        if (/^on_window\w+/.test(key)) {
                            (function (key, a) {
                                // CREATE a closure and add the event listener to the window
                                window.addEventListener(
                                    key.substring(9),
                                    func,
                                    false
                                );
                            })(key, a)
                        }
                        else if (/^on\w+/.test(key)) {
                            (function (key, a) {
                                // CREATE a closure and add the event listener
                                if (parent.addEventListener) {
                                    parent.addEventListener(
                                        key.substring(2),
                                        func,
                                        false
                                    );
                                }
                                else {
                                    parent.attachEvent(key, func)
                                }
                            })(key, a)
                        }
                        else {
                            parent[key] = (...args) => {
                                return a[key].apply(parent, args)
                            }
                        }
                    }
                    else if (key === "data") {
                        // Enters the key into the dataset as is.
                        // Compare to data_kebab below
                        for (let d in a[key]) {
                            parent.dataset[d] = a[key][d]
                        }
                    }
                    else if (key === "data_kebab") {
                        // Convert key from snake- to kebab- case.
                        // Handy when the data keys are like: { bs_toggle: "collapse" }
                        // And you want the key to be "bs-toggle".
                        // See data above for comparison.
                        for (let d in a[key]) {
                            const kebab = d.replace(/_/g, "-")
                            parent.setAttribute(`data-${kebab}`, a[key][d])
                            // parent.dataset[kebab] = a[key][d]
                        }
                    }
                    else if (key === "style") {
                        if (typeof a[key] === "string") {
                            parent.style = a[key]
                        }
                        else {
                            for (let d in a[key]) {
                                // Keys are underscored to make them object attributes
                                // and have to be translated to "-" for css names.
                                const styleName = d.replaceAll("_", "-")
                                parent.style[styleName] = a[key][d]
                            }
                        }
                    }
                    else if (key === "__checked") {
                        // the checked key is so irritating. One repally wants a boolean
                        // checked: [true|false] but the presence of the key is what matters
                        // not the value so this is a setter.
                        if (a[key]) {
                            parent.setAttribute("checked", "checked")
                        }
                    }
                    else {
                        parent.setAttribute(key, a[key])
                    }
                }
            }
        }
        else if (typeof a === "undefined" || a === null) {
            // Ignore
        }
        else {
            console.error(`argument to z() is of unknown type '${typeof a}'`)
        }
    }

    if (is_group) {
        // Groups apply the class list to all children and return
        // the children as a list which will cause them to be
        // accumulated into the parent's node without a child node.
        children.map((node) => {
            node.classList.add(...childClassList)
        })
        return children
    }
    else if (is_query && children.length > 0) {
        // In query mode we only replace children if there are new children
        // being created. otherwise this is just a shortcut for querySelector, eg:
        //   z("$#foo").disabled = true
        // would not replace children because it is just a query selector.

        // If there's only one child and it is a text then we do need to replace it
        if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
            parent.textContent = children[0].textContent
        }
        else {
            // A simple .replaceChildren() would blow away text nodes, so here we have to save and restore them
            let text = Array.from(parent.childNodes).filter(node => node.nodeType === Node.TEXT_NODE)

            // Remove children elements from parent but not the text nodes
            Array.from(parent.children).forEach(child => child.remove())

            // Add the children
            parent.append(...children);

            // Put the text nodes back
            text.forEach(text_node => parent.appendChild(text_node));
        }
    }
    else if (!is_query) {
        // We're appending to an existing node
        parent.append(...children);
    }
    return parent
}

function z_add_standard_helpers(el) {
    const props = {
        toggle_hidden: function (state) {
            this.classList.toggle("hidden", state)
            const event = new CustomEvent("_change_hidden", { detail: { hidden: state } })
            this.dispatchEvent(event)
        },
        show: function () {
            this.toggle_hidden(false)
        },
        hide: function () {
            this.toggle_hidden(true)
        },
        toggle_disable: function (state) {
            this.disabled = state
        },
        disable: function () {
            this.toggle_disable(true)
        },
        enable: function () {
            this.toggle_disable(false)
        }
    }
    for(let i in props) {
        let prop = props[i]
        z_append(el, {[i]: prop})
    }
}

let z_gen_func_by_id = {}

export function z() {
    let a = arguments[0]
    let n_args = arguments.length
    let parent // Node to manipluate
    let child_class_list = []
    let is_group = false
    let is_query = false

    if (a instanceof HTMLElement) {
        // If the first argument is an existing HTML node then that is the parent
        // And we clear it's children
        parent = a
        parent.replaceChildren()
    }
    else if (a instanceof Function) {
        // Run function which is expected to rturn a single node (raise if not)
        // Then bind a new function called "run" to that node which will re-execute
        let result = a(parent)
        if (!(result instanceof HTMLElement)) {
            throw new Error("z(): Function argument did not return an HTMLElement")
        }
        // children.push(result)
        result.run = () => {
            // Clear children
            result.replaceChildren()
            // Re-run function to get new children
            let new_result = a(parent)
            if (!(new_result instanceof HTMLElement)) {
                throw new Error("z(): Function argument did not return an HTMLElement")
            }
            // Append new children
            result.append(...new_result.childNodes)
        }
        parent = result
    }
    else if (typeof a === "string") {
        // First argument is a string so it is either a new node ie "div#my-id"
        // or a reference to an exsting node "$#my-id". Replace its children
        if (a[0] === "$") {
            // Querying an existing node
            a = a.substring(1)
            parent = document.querySelector(a)
            console.assert(parent)
            is_query = true
        }
        else if (a[0] === "@") {
            if (arguments.length > 1) {
                console.error(
                    "In z(), when using @ selection you may not pass > 1 argument."
                )
            }
            a = a.substring(1)
            return [...document.querySelectorAll(a)]
        }
        // else if (a[0] === "^") {
        //     // Generator
        //     const id = a.substring(1);
        //     if (n_args > 1) {
        //         // Instancing the generator
        //         const gen_func = arguments[1]
        //         const node = gen_func();
        //         if (!node || node.tagName != "DIV") {
        //             console.error(`z generator function on id '${id}' should return an empty div.`)
        //         }
        //         if (node.id) {
        //             console.error(`z generator function on id '${id}' return a node with an id. Should be naked.`)
        //         }
        //         z_gen_func_by_id[id] = gen_func
        //         node.setAttribute("id", id)
        //         return node
        //     }
        //     else {
        //         // Find existing node and replace its children
        //         const old_node = document.getElementById(id)
        //         const new_node = z_gen_func_by_id[id]()
        //         old_node.replaceChildren(...new_node.childNodes)
        //         return old_node
        //     }
        // }
        else {
            // Creating a new node or grouping; split the selector by tags, ids and classes
            let m = a.split(/(?=[\.#])/g)
            if (m[0] === "body") {
                console.log("You are attempting to create a 'body' tag, you probably mean '$body'");
            }

            if (m[0] === "" || m[0][0] === ".") {
                // No tag is given so this is a group.
                // Apply the classes to all children and lace a null in the tag position
                is_group = true
                m = [null, ...m]
            }
            else {
                parent = document.createElement(m[0])
                z_add_standard_helpers(parent)
            }

            m.slice(1).forEach(function (i) {
                let term = i.substring(1);
                if (i[0] === ".") {
                    if (parent) {
                        parent.classList.add(term)
                    }
                    else {
                        child_class_list.push(term)
                    }
                }
                else if (i[0] === "#") {
                    if (parent) {
                        if (/^\d/.test(term)) {
                            console.assert(`Id ${term} invalid. Cannot start with a number.`)
                        }
                        parent.setAttribute("id", term)
                    }
                    else {
                        console.error("z() groups can not have id");
                    }
                }
            })
        }
    }
    else {
        console.error("z(): Unknown first argument type:", a)
    }

    z_append([parent, is_group, is_query], ...Array.prototype.slice.call(arguments, 1))

    return parent
}

export function z_mixin(node, ...mixins) {
    // Mixins are string or full objects that you are using to modify the node
    // Handy when you want to mix in some properties onto an element so that
    // the element code does not have to expose and "args..." type arg.
    //
    //     z_mixin(
    //         z_toggle_button("a button", true),
    //         {
    //             // Attach onclick via the mixin to the element returned by the toggle without
    //             // the toggle having to expose an args property on its constructor
    //             onclick(e) { console.log("Clicked") }
    //         }
    //     )
    //
    // Note that any STRING will be used as a class name (and leading dot is removed)
    //
    //     z_mixin(
    //         z_toggle_button("a button", true),
    //         "adding-this-class",
    //         ".and-this-class",
    //         {
    //             // Attach onclick via the mixin to the element returned by the toggle without
    //             // the toggle having to expose an args property on its constructor
    //             onclick(e) { console.log("Clicked") }
    //         }
    //     )

    let other_mixins = {}
    for(let arg of mixins) {
        if (typeof arg === "string") {
            // If the mixin is a string then it is a class name
            let cls = arg[0] === "." ? arg.substring(1) : arg
            if(cls !== "") {
                node.classList.add(cls)
            }
        }
        else if (typeof arg === "object") {
            // If the mixin is an object then it is a set of properties to add
            other_mixins = { ...other_mixins, ...arg }
        }
    }

    z_append(node, other_mixins)

    return node
}

// TODO Document
class _z_classes {
    constructor(...classes) {
        this.classes = classes
    }
}

export function z_classes(...classes) {
    return new _z_classes(...classes)
}
