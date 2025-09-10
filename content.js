// create a json object of the element with the element's properties as the fields
function jsonifyHTML(element) {
    const attrs = {};
    for (let attr of element.attributes) {
        if (attr.name !== "value") {
            attrs[attr.name] = attr.value;
        }
    }

    const moreAttr = {
		label: "",
		legend: "",
		p: "",
		span: "",
		div: "",
		h1: "",
		h2: "",
		h3: "",
		h4: "",
		h5: "",
		h6: "",
		small: "",
		em: "",
		strong: "",
		li: "",
		td: "",
		th: "",
		caption: "",
		section: "",
		article: "",
		section: "",
		aside: "",
		output: "",
		figcaption: ""
	};

    // fill the keys with their values
    // start with the siblings
    const keys = Object.keys(moreAttr);
    let current = element.previousElementSibling;

    while (current) {
        const key = current.tagName.toLowerCase();

        if (keys.includes(key)) {
            moreAttr[key] = current.innerText;
        }

        current = current.previousElementSibling;
    }

    // then the ancestors
    for (let key of keys) {
        if (moreAttr.key == "") {
            const el = element.closest(key);

            if (el) {
                moreAttr[key] = el.innerText;
            }
        }
        attrs[`closest_${key}`] = moreAttr[key];
    }

    // add tag name and outerHTML
    attrs.tag = element.tagName.toLowerCase();
    attrs["options"] = [];

    // get the options if available
    if (element.tagName === "SELECT" && element.children.length > 0) {
        element.querySelectorAll("option").forEach(option => attrs["options"].push(option.value));
    }

    return attrs;
}


// handle messages from popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // create a json object of inputs that require answers
    if (request.action ===  "readInputs") {
        // get elements and their corresponding sister elements
        const inputs = Array.from(document.querySelectorAll("input[type='text'], input[type='password'], input[type='email'], textarea, select")).filter(el => {
            return el.offsetParent !== null && getComputedStyle(el) !== "hidden" && !el.disabled && !el.ariaReadOnly;
        });

        // Build an array of objects with all attributes
        const data = inputs.map(element => jsonifyHTML(element));

        sendResponse({ data });
    }

    // fill in read inputs with the stored values
    if (request.action === "writeInputs") {
        const inputs = request.inputs;
        const classifications = request.classifications;

        (async() => {
            // choose the best option for the select fields
            const ids = [];
            const selectFieldValues = [];
            const selectFieldOptions = [];
            for (let i = 0; i < inputs.length; i++) {
                if (inputs[i].tag === "select" && inputs[i].options.length > 0) {
                    const result = await chrome.storage.local.get(classifications[i]);
                    const value = result[classifications[i]] ?? "";

                    if (value !== "" && !(inputs[i].options.length === 1 && inputs[i].options[0] === "")) {
                        selectFieldValues.push(value);
                        selectFieldOptions.push(inputs[i].options);
                        ids.push(inputs[i].id);
                    }
                }
            }

            // prompt the LLM
            if (selectFieldValues.length > 0) {
                const prompt = `Given a list of values and a list of list of options i want you to determine which option in the list of options best matches the corresponding value. The index of a value corresponds to the index of a list of options that should be mapped. Return a list of corresponding options that best matches the values in the same order without any additional text.
                Here is the list of values ${JSON.stringify(selectFieldValues, null, 2)}. Here is the list of options ${JSON.stringify(selectFieldOptions, null, 2)}. Return a properly formatted list.`;

                console.log(prompt);
                console.log("Sending message to ollama");

                const response =  await fetch("http://localhost:11434/api/generate", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        model: "deepseek-r1:8b",
                        prompt: prompt,
                        stream: false
                    })
                });

                console.log("Response received");

                // fill in the select fields
                if (response.ok) {
                    try {

                        const result = await response.json();
                        const ollamaResponse = result.response;
                        console.log(ollamaResponse);
                        
                        // parse the necessary part in the string (answers are after the </think> tag when using deepseek LLM)
                        const match = ollamaResponse.match(/<\/think>([\s\S]*)/);
                        console.log(match);
                        console.log(match[1]);
                        const selectFieldResults = match ? JSON.parse(match[1].trim()): [];
                        console.log(selectFieldResults);

                        // fill in select fields with the results
                        for (let i = 0; i < ids.length; i++) {
                            const element = document.getElementById(ids[i]);
                            element.value = selectFieldResults[i];
                        }

                        console.log("Filled select fields");
                    } catch (error) {
                        console.error("Something went wrong ", error);
                    }
                } else {
                    console.log("Response not okay");
                }
            }

            console.log("Start filling other fields");

            // fill in the text input fields that we have answers to
            for (let i = 0; i < inputs.length; i++) {
                if (inputs[i].tag !== "select") {
                    console.log("Filling other fields");
                    const element = document.getElementById(inputs[i].id);
                    console.log(classifications[i]);
                    const value = await chrome.storage.local.get(classifications[i]);
                    console.log(value);
                    element.value = value[classifications[i]] ?? "";
                }
            }
        })();

        sendResponse({});
        return true;
    }
});